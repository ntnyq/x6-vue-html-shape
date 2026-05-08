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
 * @template N
 */
export interface VueShapeContext<N extends Node = Node> {
  /** Current X6 node instance. */
  node: N
  /** Current X6 graph instance. */
  graph: Graph
}

/**
 * Default props passed to a Vue shape component.
 *
 * @template N
 */
export interface VueShapeComponentProps<N extends Node = Node> {
  /** Current X6 node instance. */
  node: N
  /** Current X6 graph instance. */
  graph: Graph
}

/**
 * Vue component type used by a registered shape renderer.
 *
 * @template N
 */
export type VueShapeComponent<N extends Node = Node> = Component<
  VueShapeComponentProps<N>
>

/**
 * Dependency injection contract provided by the mount root.
 *
 * @template N
 */
export interface VueShapeProvide<N extends Node = Node> {
  /** Returns the active node instance. */
  getNode: () => N
  /** Returns the active graph instance. */
  getGraph: () => Graph
}

/**
 * Extra node metadata consumed by the Vue HTML shape view.
 */
export interface VueHtmlShapeProperties {
  /** Raw X6 markup metadata passed through node props. */
  markup?: unknown
  /** Raw X6 attrs metadata passed through node props. */
  attrs?: Record<string, unknown>
  /** Inline component bound directly on node metadata. */
  component?: Component
  /** SVG primer tag used when creating default node markup. */
  primer?: Primer
  /** Extra class names applied to the HTML wrapper element. */
  htmlClassName?: string
  /** Inline styles applied to the HTML wrapper element. */
  htmlStyle?: Record<string, string>
  /** Whether pointer interaction is enabled for this node's HTML layer. */
  interactive?: boolean
  /** Whether node content should follow graph scaling using CSS transform. */
  scaleContent?: boolean
  /** Whether HTML visibility should synchronize with node visibility. */
  syncVisible?: boolean
  /** Reserved compatibility flag for Safari-safe rendering behavior. */
  safariSafe?: boolean
  /** Custom container factory for where the node HTML root should be mounted. */
  getContainer?: (graph: Graph, node: Node) => HTMLElement
  /** Extra component props, updated through node.setProp or node.setPropByPath. */
  props?: Record<string, unknown>
  /** Preserve the component instance on updates. Set false to force remounts. */
  keepAliveOnUpdate?: boolean
}

/**
 * Registration options for the default Vue HTML shape.
 */
export interface RegisterVueHtmlShapeOptions {
  /** Shape name to register. Defaults to the package default shape name. */
  shape?: string
  /** Also register a compatibility alias using `vue-shape`. */
  compatibleShapeName?: boolean
  /** Whether to overwrite an existing node registration with the same shape name. */
  overwrite?: boolean
  /** Primer tag used for generated node markup. */
  primer?: Primer
  /** Default component to bind to the registered shape name. */
  component?: Component
}

/**
 * Registration options for a single custom Vue HTML node shape.
 */
export interface RegisterVueHtmlNodeOptions {
  /** Shape name to register. */
  shape: string
  /** Component used to render the shape. */
  component: Component
  /** Primer tag used for generated node markup. */
  primer?: Primer
  /** Whether to overwrite an existing node registration. */
  overwrite?: boolean
}

/**
 * Plugin-level options used by `install` and `createVueHtmlShapePlugin`.
 */
export interface VueHtmlShapePluginOptions extends RegisterVueHtmlShapeOptions {
  /** Whether to inject built-in CSS styles automatically. */
  injectStyle?: boolean
}

/**
 * Internal state for the HTML overlay layer bound to an X6 graph.
 */
export interface VueHtmlLayerState {
  /** Layer root element. */
  root: HTMLElement
  /** Graph instance that owns the layer. */
  graph: Graph
  /** Map of node id to mounted HTML root element. */
  nodes: Map<string, HTMLElement>
}

/**
 * Internal bookkeeping for a mounted Vue application instance.
 */
export interface MountedVueInstance {
  /** Mounted Vue app instance. */
  app: App<Element>
  /** Mount root element. */
  root: HTMLElement
  /** Component currently mounted in the app. */
  component: Component
}
