import { NodeView } from '@antv/x6'
import type { Dom } from '@antv/x6'
import type { App, Component } from 'vue'
import { shallowRef } from 'vue'
import {
  DEFAULT_SHAPE_NAME,
  DEFAULT_VIEW_NAME,
  HTML_NODE_CLASS,
  HTML_NODE_CONTENT_CLASS,
} from './constants'
import { shouldStopGraphMouseDown } from './events'
import {
  ensureVueHtmlLayer,
  releaseVueHtmlRoot,
  removeEmptyVueHtmlLayer,
  trackVueHtmlTransform,
} from './layer'
import { getVueShapeComponent } from './registry'
import type { VueHtmlShapeProperties } from './types'
import { updateHtmlStyle } from './utils/dom'
import { getHtmlNodeGeometry } from './utils/geometry'
import { mountVueComponent } from './utils/vue'

// Reserve the top CSS z-index even when the X6 model already uses very high values.
const SELECTED_HTML_Z_INDEX = 2_147_483_647

function stopInteractiveMouseDown(event: Event) {
  const originalTarget = event.composedPath()[0]

  if (
    shouldStopGraphMouseDown(event.target) ||
    (originalTarget !== event.target &&
      shouldStopGraphMouseDown(originalTarget ?? null))
  ) {
    event.stopPropagation()
  }
}

/**
 * X6 node view that renders Vue content into an external HTML overlay layer.
 */
export class VueHtmlShapeView extends NodeView {
  /**
   * X6 action key used to trigger HTML rendering updates.
   */
  public static action = 'vue-html' as never

  private app: Pick<App, 'unmount'> | undefined
  private htmlRoot: HTMLDivElement | undefined
  private contentRoot: HTMLDivElement | undefined
  private mountedComponent: Component | undefined
  private componentProps = shallowRef<Record<string, unknown>>({})
  private htmlStyle: Record<string, string> = {}

  /**
   * X6 action key for wrapper attribute, geometry and visibility updates.
   */
  public static geometryAction = 'vue-html-geometry' as never

  /**
   * Handle X6 view updates and refresh HTML render/position/visibility state.
   *
   * @param flag - Update bitmask from X6.
   * @returns Remaining update flags after handling HTML action.
   */
  public override confirmUpdate(flag: number) {
    const ret = super.confirmUpdate(flag)

    const updated = this.handleAction(ret, VueHtmlShapeView.action, () => {
      this.renderVueComponent()
      this.updateHtmlPosition()
      this.updateHtmlVisible()
    })

    if (this.hasAction(flag, ['render', 'update', VueHtmlShapeView.action])) {
      this.updateHtmlCursor()
    }

    return this.handleAction(updated, VueHtmlShapeView.geometryAction, () => {
      this.updateHtmlAttributes()
      this.updateHtmlPosition()
      this.updateHtmlVisible()
    })
  }

  /**
   * Read the X6 node metadata used by the HTML view.
   *
   * @returns Node properties for HTML rendering.
   */
  protected getNodeProperties(): VueHtmlShapeProperties {
    return this.cell.getProp() as VueHtmlShapeProperties
  }

  /**
   * Resolve the inline component, then try the node shape and default shape
   * registrations in that order.
   *
   * @returns Component to render, if one is available.
   */
  protected getComponent(): Component | undefined {
    const props = this.getNodeProperties()

    return (
      props.component ||
      getVueShapeComponent(this.cell.shape) ||
      getVueShapeComponent(DEFAULT_SHAPE_NAME)
    )
  }

  /**
   * Create or reuse the node's HTML wrapper and Vue mount target.
   *
   * @returns The Vue mount target and its outer wrapper.
   */
  protected ensureHtmlRoot() {
    if (this.htmlRoot && this.contentRoot) {
      return {
        contentRoot: this.contentRoot,
        htmlRoot: this.htmlRoot,
      }
    }

    const { ownerDocument } = this.graph.container
    const htmlRoot = ownerDocument.createElement('div')

    htmlRoot.className = HTML_NODE_CLASS
    htmlRoot.dataset['x6NodeId'] = String(this.cell.id)
    htmlRoot.dataset['cellId'] = String(this.cell.id)
    // Stop before GraphView can prevent focus or delegate drag events.
    htmlRoot.addEventListener('mousedown', stopInteractiveMouseDown)
    htmlRoot.addEventListener('touchstart', stopInteractiveMouseDown)

    const contentRoot = ownerDocument.createElement('div')

    contentRoot.className = HTML_NODE_CONTENT_CLASS
    htmlRoot.append(contentRoot)

    this.htmlRoot = htmlRoot
    this.contentRoot = contentRoot

    return {
      contentRoot,
      htmlRoot,
    }
  }

  /**
   * Update component props, mount or remount the resolved component as needed,
   * or remove the HTML wrapper when no component is available.
   */
  protected renderVueComponent() {
    const component = this.getComponent()

    if (!component) {
      this.removeHtmlRoot()

      return
    }

    const props = this.getNodeProperties()
    const { contentRoot } = this.ensureHtmlRoot()

    this.updateHtmlAttributes()
    this.componentProps.value = props.props || {}

    const shouldRemount =
      !this.app ||
      this.mountedComponent !== component ||
      props.keepAliveOnUpdate === false

    if (shouldRemount) {
      this.unmountVueComponent()

      this.app = mountVueComponent({
        component,
        graph: this.graph,
        node: this.cell,
        root: contentRoot,
        props: this.componentProps,
      })
      this.mountedComponent = component
    }
  }

  /**
   * Update the wrapper container, classes, styles and transform subscription.
   */
  protected updateHtmlAttributes() {
    if (!this.htmlRoot) {
      return
    }

    const props = this.getNodeProperties()
    const container = props.getContainer
      ? props.getContainer(this.graph, this.cell)
      : ensureVueHtmlLayer(this.graph)

    if (this.htmlRoot.parentElement !== container) {
      container.append(this.htmlRoot)
      removeEmptyVueHtmlLayer(this.graph)
    }

    // X6 delegates node entry and exit through its cell class.
    this.htmlRoot.className = [
      HTML_NODE_CLASS,
      this.prefixClassName('cell'),
      props.htmlClassName,
    ]
      .filter(Boolean)
      .join(' ')
    updateHtmlStyle(this.htmlRoot, this.htmlStyle, props.htmlStyle || {})
    this.htmlStyle = { ...props.htmlStyle }
    trackVueHtmlTransform(
      this.graph,
      this.htmlRoot,
      props.getContainer || props.scaleContent === false
        ? () => this.updateHtmlPosition()
        : undefined,
    )
  }

  /**
   * Synchronize HTML node size, transform and z-index with graph/node state.
   */
  public updateHtmlPosition() {
    if (!this.htmlRoot) {
      return
    }

    const node = this.cell
    const props = this.getNodeProperties()

    Object.assign(
      this.htmlRoot.style,
      getHtmlNodeGeometry(node, this.graph, props),
    )
    this.htmlRoot.style.transformOrigin = '0 0'

    const zIndex = Math.min(node.getZIndex() || 0, SELECTED_HTML_Z_INDEX - 1)

    this.htmlRoot.style.zIndex = String(
      this.graph.isSelected?.(node) ? SELECTED_HTML_Z_INDEX : zIndex,
    )
  }

  private updateHtmlCursor() {
    this.htmlRoot?.style.setProperty(
      '--x6-vue-cursor',
      this.container.ownerDocument.defaultView?.getComputedStyle(this.container)
        .cursor ?? '',
    )
  }

  /**
   * Synchronize HTML visibility and interactivity CSS state.
   */
  public updateHtmlVisible() {
    if (!this.htmlRoot) {
      return
    }

    const props = this.getNodeProperties()
    const visible = this.cell.isVisible()

    this.htmlRoot.classList.toggle(
      'is-hidden',
      props.syncVisible !== false && !visible,
    )

    this.htmlRoot.classList.toggle(
      'is-non-interactive',
      props.interactive === false,
    )
  }

  /**
   * Unmount the Vue component and clear its stored mount handle.
   */
  protected unmountVueComponent() {
    this.app?.unmount()
    this.app = undefined
    this.mountedComponent = undefined
  }

  /**
   * Remove HTML roots and release mounted component resources.
   */
  protected removeHtmlRoot() {
    this.unmountVueComponent()

    this.htmlRoot?.removeEventListener('mousedown', stopInteractiveMouseDown)
    this.htmlRoot?.removeEventListener('touchstart', stopInteractiveMouseDown)
    this.htmlRoot?.remove()

    if (this.htmlRoot) {
      releaseVueHtmlRoot(this.graph, this.htmlRoot)
    }

    this.htmlRoot = undefined
    this.contentRoot = undefined
    this.htmlStyle = {}
  }

  /**
   * Delegate mouse down to X6 unless it started on an interactive element.
   *
   * @param event - Mouse event passed by X6.
   * @param x - Graph x coordinate.
   * @param y - Graph y coordinate.
   */
  public override onMouseDown(event: Dom.MouseDownEvent, x: number, y: number) {
    if (shouldStopGraphMouseDown(event.target)) {
      return
    }

    super.onMouseDown(event, x, y)
  }

  /**
   * Mirror the SVG view cursor after X6 updates its interaction classes.
   *
   * @param event - Mouse event passed by X6.
   */
  public override onMouseEnter(event: Dom.MouseEnterEvent) {
    super.onMouseEnter(event)
    this.updateHtmlCursor()
  }

  /**
   * Unmount the view and clean up its HTML overlay roots.
   *
   * @returns Current view instance.
   */
  public override unmount() {
    this.removeHtmlRoot()
    super.unmount()

    return this
  }
}

VueHtmlShapeView.config({
  actions: {
    component: VueHtmlShapeView.action,
    data: VueHtmlShapeView.action,
    angle: VueHtmlShapeView.geometryAction,
    getContainer: VueHtmlShapeView.geometryAction,
    htmlClassName: VueHtmlShapeView.geometryAction,
    htmlStyle: VueHtmlShapeView.geometryAction,
    interactive: VueHtmlShapeView.geometryAction,
    keepAliveOnUpdate: VueHtmlShapeView.action,
    position: VueHtmlShapeView.geometryAction,
    props: VueHtmlShapeView.action,
    scaleContent: VueHtmlShapeView.geometryAction,
    size: VueHtmlShapeView.geometryAction,
    syncVisible: VueHtmlShapeView.geometryAction,
    visible: VueHtmlShapeView.geometryAction,
    zIndex: VueHtmlShapeView.geometryAction,
  },
  bootstrap: [VueHtmlShapeView.action],
})

NodeView.registry.register(DEFAULT_VIEW_NAME, VueHtmlShapeView, true)
