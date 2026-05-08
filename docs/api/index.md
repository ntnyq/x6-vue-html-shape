# Complete API

This page describes the current `x6-vue-html-shape` package entry. Supported peers
are Vue `^3.3.0` and X6 `^3.0.0`. The package exposes ESM and TypeScript declarations.

Public import paths are `x6-vue-html-shape`, `x6-vue-html-shape/style.css` and
`x6-vue-html-shape/package.json`. Helpers under source `utils/` and internal
Teleport/layer functions are not public subpath exports.

## Installation

### `install(app, options?)` — also the default export

Registers the base shape and optionally injects built-in CSS. The `app` parameter
is a Vue application; it is not stored as the context of future node apps.

### `createVueHtmlShapePlugin(options?)`

Returns a `Plugin` for `app.use(...)`, using the same installation behavior:

```ts
import { createVueHtmlShapePlugin } from 'x6-vue-html-shape'

app.use(createVueHtmlShapePlugin({ injectStyle: true }))
```

Neither installation API creates graphs, enables graph synchronization or mounts
Teleport hosts. Call the corresponding APIs for each graph. If you register
shapes directly, import `x6-vue-html-shape/style.css` yourself.

`VueHtmlShapePluginOptions` extends the registration options below with
`injectStyle?: boolean`, defaulting to `true`.

## Shape registration

### `registerVueHtmlShapeNode(options?)`

Registers a base shape with the HTML view. Returns `void`.

| `RegisterVueHtmlShapeOptions` field | Default            | Meaning                                                       |
| ----------------------------------- | ------------------ | ------------------------------------------------------------- |
| `shape?: string`                    | `'vue-html-shape'` | Name in the X6 node registry                                  |
| `compatibleShapeName?: boolean`     | `false`            | Also register the `'vue-shape'` alias                         |
| `overwrite?: boolean`               | `false`            | Permit replacing an existing X6 shape                         |
| `primer?: Primer`                   | `'rect'`           | SVG body tag                                                  |
| `component?: Component`             | Unset              | Component binding for the registered shape and optional alias |

The default SVG body is transparent. `circle` and `ellipse` receive relative
geometry attributes. Other tags can require explicit geometry: for example `d`
for paths and points for polygons/polylines. The Vue content itself remains HTML.

### `registerVueHtmlNode(options)`

Registers one shape/component pair. Returns `void`.

`RegisterVueHtmlNodeOptions` requires `shape: string` and `component: Component`;
it accepts optional `primer` and `overwrite` with the same defaults as above.
It does not accept arbitrary X6 defaults such as width, ports or `inherit`. Use
`Graph.registerNode` plus a component binding for that
([migration example](../guide/migration.md#preserve-inherited-node-defaults)).

Importing the package registers `VueHtmlShapeView` under `DEFAULT_VIEW_NAME`, but
base/custom node shapes still require registration. Shape names and component
bindings are shared across graphs using the same package instance.

## Component registry

| Function                                      | Return                     | Behavior                              |
| --------------------------------------------- | -------------------------- | ------------------------------------- |
| `registerVueShapeComponent(shape, component)` | `void`                     | Create or replace a component binding |
| `getVueShapeComponent(shape)`                 | `Component` or `undefined` | Read the current binding              |
| `unregisterVueShapeComponent(shape)`          | `void`                     | Remove one component binding          |
| `clearVueShapeComponents()`                   | `void`                     | Remove all component bindings         |

These functions change the component map, not the X6 shape registry. They do not
notify or unmount existing views immediately. Component resolution on a subsequent
Vue render action uses this order:

1. The node's `component` property.
2. The component registered for `node.shape`.
3. The component registered for `DEFAULT_SHAPE_NAME`.

If all are absent, existing HTML content is removed. Removing a node component
property can therefore reveal a registered fallback instead of making it empty.
`ShapeRegistryItem` is the exported entry type, with `component?: Component`.

## Vue application context

### `createVueHtmlTeleport(graph): Component`

Creates the host component for one Graph. Mount it below the desired providers
before adding nodes; creating the component alone does not activate the host.
Without a mounted host, nodes use standalone Vue apps.

A host inherits its surrounding Vue tree's providers, global components,
directives and plugin context. Nodes always receive `node`/`graph` props plus
`getNode`/`getGraph` injection. Extra props cannot override the owning node or graph.

Only one host may be mounted per graph; a duplicate throws. Multiple graphs can
have separate hosts and identical node IDs. Keep the host mounted until the graph
has been disposed. Switching hosts for live nodes is unsupported. Teleport DOM
updates and unmount hooks complete through Vue's update queue; await `nextTick()`
when inspecting them.

See [Vue context](../guide/vue-context.md) for a complete component example.

## Graph synchronization

### `setupVueHtmlShapeSync(graph, options?): () => void`

Enables synchronization and returns a disposer. Repeated calls for the same graph
return the existing disposer and retain its original options. Dispose before
changing options. X6's plugin lifecycle also invokes cleanup on `graph.dispose()`.

- Scale, translate and resize events update the shared layer matrix immediately.
  Ordinary nodes inherit it; no normal-node style loop is needed for those events.
- Custom-container nodes and `scaleContent: false` nodes receive individual
  geometry updates on graph transforms.
- Direct viewport matrix changes, including `graph.matrix(...)` and graph rotation,
  are observed through `MutationObserver`; they update when its callback runs.
- Node events are merged per animation frame by default. Z-index changes and cell
  removals can still schedule a full node refresh.
- X6 view actions also update local geometry and presentation. The RAF option
  governs the synchronizer's queue, not every update performed by X6 or Vue.

| `SyncOptions` field           | Default | Effect                                                              |
| ----------------------------- | ------- | ------------------------------------------------------------------- |
| `useAnimationFrame?: boolean` | `true`  | Batch synchronizer node work; `false` flushes that work immediately |
| `throttle?: number`           | Unset   | Reserved; currently has no effect                                   |

The disposer removes listeners, disconnects the observer and cancels pending
frames. It does not dispose the graph or unmount live node components. Use
`graph.dispose()` for page/component teardown.

## Node rendering properties

`VueHtmlShapeProperties` describes renderer-specific metadata. Supply ordinary
X6 fields such as position, dimensions, ports and data through X6 node metadata.

| Field                                         | Default                   | Behavior                                                                                              |
| --------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `component?: Component`                       | Registry fallback         | Explicit node component; changing the resolved component remounts it                                  |
| `props?: Record<string, unknown>`             | `{}`                      | Extra component props; updated without remounting by default                                          |
| `keepAliveOnUpdate?: boolean`                 | `true`                    | `false` forces remount on component/data/props render actions; geometry changes preserve the instance |
| `htmlClassName?: string`                      | Unset                     | Wrapper classes; changes remove obsolete classes                                                      |
| `htmlStyle?: Record<string, string>`          | Unset                     | Wrapper styles, including CSS custom properties; obsolete styles are cleared                          |
| `interactive?: boolean`                       | `true`                    | `false` disables pointer events on the HTML wrapper; it does not disable the X6 graph                 |
| `scaleContent?: boolean`                      | `true`                    | `false` preserves the transformed box but lays out content at screen scale                            |
| `syncVisible?: boolean`                       | `true`                    | Mirror node visibility; disabling this also clears the wrapper's hidden class                         |
| `getContainer?: (graph, node) => HTMLElement` | Owned HTML layer          | Custom mount target; runtime changes move the existing wrapper                                        |
| `primer?: Primer`                             | `'rect'`                  | SVG body configuration during node creation                                                           |
| `markup?: unknown`                            | Generated SVG body        | Optional custom X6 markup; caller owns its geometry                                                   |
| `attrs?: Record<string, unknown>`             | Transparent body defaults | X6 SVG attributes, not CSS for the external HTML content                                              |
| `safariSafe?: boolean`                        | Unset                     | Reserved; currently has no effect                                                                     |

Use X6 setters to trigger runtime changes:

```ts
node.setPropByPath('props/label', 'Updated label')
node.removeProp('props')
node.setProp('htmlClassName', 'is-highlighted')
node.setProp('htmlStyle', { backgroundColor: 'white' }, { rewrite: true })
node.setProp('interactive', false)
```

`rewrite: true` is useful when replacing an object property rather than merging it.
The view responds to component/data/props and presentation changes; changing
`primer` at runtime is not a dedicated HTML-view action. Configure SVG markup/attrs
through X6 rather than assuming every creation option is a live renderer switch.

Node layout owns wrapper width, height, transform, transform origin and z-index.
Do not use caller styles to override these or the internal `--x6-vue-transform`
variable. For visual customization, prefer styling the component's own root.
The library does not automatically resize the node model from intrinsic HTML size.

Custom containers must share the graph container's coordinate origin and positioning
context. Keep them inside the graph container for X6 event delegation. Arbitrary
body-level containers are not automatically positioned in page coordinates.

## Data subscription

### `useX6NodeData<T = unknown>(node): ShallowRef<T>`

Reads initial node data, subscribes to `change:data` and removes that listener in
`onBeforeUnmount`. Call it in a Vue component's setup lifecycle. Initialize data
matching `T`; the generic does not validate or create missing fields at runtime.

This is a shallow, one-way subscription. Write through `node.setData(...)` and
use X6's events; assigning to the returned ref does not update the node. A generic
Vue effect scope alone does not provide this helper's component-unmount cleanup.

## Interaction guard

### `shouldStopGraphMouseDown(target): boolean`

Accepts `EventTarget | null`. It protects inputs, textareas, selects, buttons,
links, editable content and descendants of `[data-x6-vue-stop]`. Editable ancestor
lookup honors `contenteditable="false"` boundaries. The HTML wrapper uses this
predicate to stop `mousedown` and `touchstart` propagation before graph handlers
can interfere with native controls.

It is not a general keyboard, wheel, popup-positioning or graph-readonly policy.

## Layer and view management

### `ensureVueHtmlLayer(graph): HTMLElement`

Creates/reuses the owned layer, initializes its shared matrix and makes a static
container relatively positioned. Most consumers do not need to call it directly.

### `removeVueHtmlLayer(graph): void`

Removes the owned layer element and its lookup entry. This low-level DOM helper
does not dispose node Vue instances. Dispose the graph or remove its nodes before
using it; removing DOM around live views is not a substitute for their lifecycle.
Custom-container nodes are not children of the owned layer.

### `VueHtmlShapeView`

Exported X6 NodeView subclass. Its public `updateHtmlPosition()` and
`updateHtmlVisible()` synchronize an existing HTML wrapper; `unmount()` releases
its component and wrapper. Normal consumers should let X6 manage view actions and
use `setupVueHtmlShapeSync` for graph transforms. The `action` and `geometryAction`
static keys are X6 view-action integration details.

## Constants

| Export                    | Value                      |
| ------------------------- | -------------------------- |
| `DEFAULT_SHAPE_NAME`      | `vue-html-shape`           |
| `COMPAT_SHAPE_NAME`       | `vue-shape`                |
| `DEFAULT_VIEW_NAME`       | `vue-html-shape-view`      |
| `HTML_LAYER_CLASS`        | `x6-vue-html-layer`        |
| `HTML_NODE_CLASS`         | `x6-vue-html-node`         |
| `HTML_NODE_CONTENT_CLASS` | `x6-vue-html-node-content` |
| `STYLE_ID`                | `x6-vue-html-shape-style`  |

## Additional exported types

| Type                                            | Shape / purpose                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| `Primer`                                        | `'rect'`, `'circle'`, `'path'`, `'ellipse'`, `'polygon'`, `'polyline'` |
| `VueShapeContext<N extends Node = Node>`        | `{ node: N; graph: Graph }`                                            |
| `VueShapeComponentProps<N extends Node = Node>` | Node and graph props                                                   |
| `VueShapeComponent<N extends Node = Node>`      | Vue component accepting the context props                              |
| `VueShapeProvide<N extends Node = Node>`        | `getNode: () => N`, `getGraph: () => Graph`                            |
| `VueHtmlLayerState`                             | Structural type with `root`, `graph`, `nodes`                          |
| `MountedVueInstance`                            | Structural type with `app`, `root`, `component`                        |

`VueHtmlLayerState` and `MountedVueInstance` remain exported declarations; current
mount/layer functions do not return these records. They do not provide an
imperative handle for accessing Teleport entries or the renderer's private state.

For rendering boundaries and source-backed differences, read the
[official-package comparison](../guide/comparison.md) and
[production readiness](../guide/production-readiness.md).
