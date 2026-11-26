import type { Graph, Node } from '@antv/x6'
import type { App, Component } from 'vue'

/**
 * Supported primer SVG element tags used by X6 for node markup.
 */
export type Primer =
  | 'rect'
  | 'circle'
  | 'path'
  | 'ellipse'
  | 'polygon'
  | 'polyline'

/**
 * Runtime context exposed to Vue shape components.
 *
 * @template N - Type of the X6 node.
 */
export interface VueShapeContext<N extends Node = Node> {
  /**
   * Current X6 node instance.
   */
  node: N
  /**
   * Current X6 graph instance.
   */
  graph: Graph
}

/**
 * Default props passed to a Vue shape component.
 *
 * @template N - Type of the X6 node.
 */
export interface VueShapeComponentProps<N extends Node = Node> {
  /**
   * Current X6 node instance.
   */
  node: N
  /**
   * Current X6 graph instance.
   */
  graph: Graph
}

/**
 * Vue component type used by a registered shape renderer.
 *
 * @template N - Type of the X6 node passed to the component.
 */
export type VueShapeComponent<N extends Node = Node> = Component<
  VueShapeComponentProps<N>
>

/**
 * Dependency injection contract provided by the mount root.
 *
 * @template N - Type of the X6 node returned by the provider.
 */
export interface VueShapeProvide<N extends Node = Node> {
  /**
   * Get the active node instance.
   *
   * @returns X6 node associated with the component.
   */
  getNode: () => N
  /**
   * Get the active graph instance.
   *
   * @returns X6 graph associated with the component.
   */
  getGraph: () => Graph
}

/**
 * Extra node metadata consumed by the Vue HTML shape view.
 */
export interface VueHtmlShapeProperties {
  /**
   * Raw X6 markup metadata passed through node props.
   */
  markup?: unknown
  /**
   * Raw X6 attrs metadata passed through node props.
   */
  attrs?: Record<string, unknown>
  /**
   * Inline component bound directly on node metadata.
   */
  component?: Component
  /**
   * SVG primer tag used when creating default node markup.
   */
  primer?: Primer
  /**
   * Extra class names applied to the HTML wrapper element.
   */
  htmlClassName?: string
  /**
   * Inline styles applied to the HTML wrapper element.
   */
  htmlStyle?: Record<string, string>
  /**
   * Whether pointer interaction is enabled for this node's HTML layer.
   *
   * @default true
   */
  interactive?: boolean
  /**
   * Whether Vue content scales with the graph. Set to `false` to resize the
   * wrapper while keeping its content unscaled.
   *
   * @default true
   */
  scaleContent?: boolean
  /**
   * Whether HTML visibility should synchronize with node visibility.
   *
   * @default true
   */
  syncVisible?: boolean
  /**
   * Reserved compatibility flag for Safari-safe rendering behavior.
   */
  safariSafe?: boolean
  /**
   * Choose a custom mounting container for the node's HTML root. When omitted,
   * the node uses the graph's shared HTML layer.
   *
   * @param graph - X6 graph that owns the node.
   * @param node - X6 node being rendered.
   * @returns Container that shares the graph's coordinate origin.
   */
  getContainer?: (graph: Graph, node: Node) => HTMLElement
  /**
   * Extra props passed to the component. Update them with `node.setProp` or
   * `node.setPropByPath`.
   */
  props?: Record<string, unknown>
  /**
   * Preserve the instance across updates while the component type is unchanged.
   * Set to `false` to force a remount on render updates.
   *
   * @default true
   */
  keepAliveOnUpdate?: boolean
}

type X6NodeConfig = Parameters<typeof Node.define>[0]

/**
 * Registration options for the default Vue HTML shape.
 */
export interface RegisterVueHtmlShapeOptions extends X6NodeConfig {
  /**
   * Shape name to register.
   *
   * @default 'vue-html-shape'
   */
  shape?: string
  /**
   * X6 node shape or class to inherit defaults and markup from.
   */
  inherit?: string | typeof Node
  /**
   * Text for the generated SVG label.
   */
  label?: string
  /**
   * Also register a compatibility alias using `vue-shape`.
   *
   * @default false
   */
  compatibleShapeName?: boolean
  /**
   * Whether to overwrite an existing node registration with the same shape
   * name.
   *
   * @default false
   */
  overwrite?: boolean
  /**
   * Primer tag used for generated node markup.
   */
  primer?: Primer
  /**
   * Default component to bind to the registered shape name.
   */
  component?: Component
}

/**
 * Registration options for a single custom Vue HTML node shape.
 */
export interface RegisterVueHtmlNodeOptions extends RegisterVueHtmlShapeOptions {
  /**
   * Shape name to register.
   */
  shape: string
  /**
   * Component used to render the shape.
   */
  component: Component
}

/**
 * Plugin-level options used by `install` and `createVueHtmlShapePlugin`.
 */
export interface VueHtmlShapePluginOptions extends RegisterVueHtmlShapeOptions {
  /**
   * Whether to inject built-in CSS styles automatically.
   *
   * @default true
   */
  injectStyle?: boolean
}

/**
 * Internal state for the HTML overlay layer bound to an X6 graph.
 */
export interface VueHtmlLayerState {
  /**
   * Layer root element.
   */
  root: HTMLElement
  /**
   * Graph instance that owns the layer.
   */
  graph: Graph
  /**
   * Map of node id to mounted HTML root element.
   */
  nodes: Map<string, HTMLElement>
}

/**
 * Internal bookkeeping for a mounted Vue application instance.
 */
export interface MountedVueInstance {
  /**
   * Mounted Vue app instance.
   */
  app: App<Element>
  /**
   * Mount root element.
   */
  root: HTMLElement
  /**
   * Component currently mounted in the app.
   */
  component: Component
}
