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
  trackVueHtmlTransform,
} from './layer'
import { getVueShapeComponent } from './registry'
import type { VueHtmlShapeProperties } from './types'
import { updateHtmlStyle } from './utils/dom'
import { getHtmlNodeGeometry } from './utils/geometry'
import { mountVueComponent } from './utils/vue'

function stopInteractiveMouseDown(event: Event) {
  if (shouldStopGraphMouseDown(event.target)) {
    event.stopPropagation()
  }
}

/**
 * X6 node view that renders Vue content into an external HTML overlay layer.
 */
export class VueHtmlShapeView extends NodeView {
  /** X6 action key used to trigger HTML rendering updates. */
  public static action = 'vue-html' as never

  private app: Pick<App, 'unmount'> | undefined
  private htmlRoot: HTMLDivElement | undefined
  private contentRoot: HTMLDivElement | undefined
  private mountedComponent: Component | undefined
  private componentProps = shallowRef<Record<string, unknown>>({})
  private htmlStyle: Record<string, string> = {}
  public static geometryAction = 'vue-html-geometry' as never

  /**
   * Handle X6 view updates and refresh HTML render/position/visibility state.
   *
   * @param {number} flag - Update bitmask from X6.
   * @returns {number} Remaining update flags after handling HTML action.
   */
  public override confirmUpdate(flag: number) {
    const ret = super.confirmUpdate(flag)

    const updated = this.handleAction(ret, VueHtmlShapeView.action, () => {
      this.renderVueComponent()
      this.updateHtmlAttributes()
      this.updateHtmlPosition()
      this.updateHtmlVisible()
    })
    return this.handleAction(updated, VueHtmlShapeView.geometryAction, () => {
      this.updateHtmlAttributes()
      this.updateHtmlPosition()
      this.updateHtmlVisible()
    })
  }

  /**
   * @returns {VueHtmlShapeProperties} Node properties for HTML rendering.
   */
  protected getNodeProperties(): VueHtmlShapeProperties {
    return this.cell.getProp() as VueHtmlShapeProperties
  }

  /**
   * @returns {Component | undefined} Resolved Vue component.
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
   * @returns {{ contentRoot: HTMLDivElement, htmlRoot: HTMLDivElement }} HTML roots used for rendering.
   */
  protected ensureHtmlRoot() {
    if (this.htmlRoot && this.contentRoot) {
      return {
        contentRoot: this.contentRoot,
        htmlRoot: this.htmlRoot,
      }
    }

    const props = this.getNodeProperties()
    const { graph } = this
    const layer = props.getContainer
      ? props.getContainer(graph, this.cell)
      : ensureVueHtmlLayer(graph)

    const htmlRoot = document.createElement('div')
    htmlRoot.className = HTML_NODE_CLASS
    htmlRoot.dataset['x6NodeId'] = String(this.cell.id)
    htmlRoot.dataset['cellId'] = String(this.cell.id)
    // Stop before GraphView can prevent focus or delegate drag events.
    htmlRoot.addEventListener('mousedown', stopInteractiveMouseDown)
    htmlRoot.addEventListener('touchstart', stopInteractiveMouseDown)

    const contentRoot = document.createElement('div')
    contentRoot.className = HTML_NODE_CONTENT_CLASS
    htmlRoot.append(contentRoot)
    layer.append(htmlRoot)

    this.htmlRoot = htmlRoot
    this.contentRoot = contentRoot

    return {
      contentRoot,
      htmlRoot,
    }
  }

  /**
   * Mount or remount the resolved Vue component into the HTML content root.
   */
  protected renderVueComponent() {
    const component = this.getComponent()

    if (!component) {
      this.removeHtmlRoot()
      return
    }

    const props = this.getNodeProperties()
    const { contentRoot } = this.ensureHtmlRoot()
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
    }
    this.htmlRoot.className = [HTML_NODE_CLASS, props.htmlClassName]
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

    this.htmlRoot.style.zIndex = String(node.getZIndex() || 0)
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
   * Unmount the Vue app and clear content root.
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
   * Skip graph-level drag behavior when mouse down starts on interactive targets.
   *
   * @param {Dom.MouseDownEvent} event - Mouse event passed by X6.
   * @param {number} x - Graph x coordinate.
   * @param {number} y - Graph y coordinate.
   */
  public override onMouseDown(event: Dom.MouseDownEvent, x: number, y: number) {
    if (shouldStopGraphMouseDown(event.target)) {
      return
    }

    super.onMouseDown(event, x, y)
  }

  /**
   * Unmount view and cleanup HTML overlay roots.
   *
   * @returns {this} Current view instance.
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
