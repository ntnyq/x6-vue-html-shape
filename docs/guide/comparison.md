# Comparison with the official Vue shape

Reviewed on **2026-09-14**. This page compares the current local
`x6-vue-html-shape` implementation (`0.0.0`) with the published
`@antv/x6-vue-shape@3.0.2`, which the npm registry reported as latest on that date.
It does not describe every historical version of the official package.

The official package embeds Vue content in SVG `foreignObject`. This package
keeps the X6 SVG node and renders its Vue content in a separate HTML layer.
Both retain Vue components and HTML layout; the official renderer does not turn
Vue templates into native SVG drawing primitives.

Official behavior below is based on its published source, not a claim that we ran
its entire test suite. **Verified** means this repository has an automated check;
**implemented** means supported by the current code without comprehensive test
coverage; **unverified** means no compatibility guarantee is established.

## Runtime and registration

The version and registration details are checked against the official
[package manifest](https://unpkg.com/@antv/x6-vue-shape@3.0.2/package.json),
[entry point](https://unpkg.com/@antv/x6-vue-shape@3.0.2/es/index.js) and
[registry implementation](https://unpkg.com/@antv/x6-vue-shape@3.0.2/es/registry.js).

| Capability                   | `x6-vue-html-shape`                                                | Official `3.0.2`                                         | Integration consequence                                                          |
| ---------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| X6 version                   | Peer range `^3.0.0`; tests use 3.1.8                               | Peer range `^3.x`                                        | Neither current package declares X6 2 support                                    |
| Vue version                  | Peer range `^3.3.0`; tests use 3.5.42                              | Declares Vue 2 and Vue 3 support                         | Vue 2 applications cannot migrate directly                                       |
| Vue compatibility layer      | Direct Vue imports                                                 | Uses `vue-demi`                                          | This package has no Vue 2 rendering branch                                       |
| Module output                | ESM and TypeScript declarations                                    | CommonJS and ESM entry points with declarations          | This package does not expose a CommonJS entry                                    |
| Base shape registration      | Explicit `registerVueHtmlShapeNode()`; default `vue-html-shape`    | Import registers `vue-shape`                             | Importing this package alone does not register a usable base node                |
| Shape/component shortcut     | `registerVueHtmlNode({ shape, component, primer?, overwrite? })`   | `register(config)`                                       | These APIs are not interchangeable aliases                                       |
| Default metadata in shortcut | Narrow registration options                                        | Forwards additional node metadata and supports `inherit` | Use X6 registration for inherited defaults, or supply metadata when adding nodes |
| Duplicate shape name         | Rejects by default; explicit `overwrite: true`                     | `register` overwrites                                    | Repeated registration must be intentional                                        |
| Component lookup             | Node `component`, then shape registry, then default-shape registry | Reads the shape registry                                 | Old examples using inline node components need version-specific interpretation   |
| Registry management          | Explicit get/register/unregister/clear helpers                     | Exposes `shapeMaps` and `register`                       | Clearing a component registry is not graph disposal                              |
| Registry scope               | Shared across graphs importing the same package instance           | Shared registry                                          | Graph-specific Teleport does not make shape names graph-local                    |
| Compatibility alias          | Optional `vue-shape` alias                                         | Default name                                             | Alias compatibility covers shape names, not all APIs or rendering semantics      |

## Vue rendering and state

These distinctions follow the official
[view implementation](https://unpkg.com/@antv/x6-vue-shape@3.0.2/es/view.js) and
[Teleport implementation](https://unpkg.com/@antv/x6-vue-shape@3.0.2/es/teleport.js).
The comparison of props and host context refers to Vue 3 execution paths.

| Capability                             | `x6-vue-html-shape`                                                                            | Official `3.0.2`                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Standalone mount                       | One Vue app per node when no host is mounted                                                   | Also has a standalone Vue app path                                    |
| Node/graph context                     | `node`/`graph` props and `getNode`/`getGraph` injection                                        | Provides the same Vue 3 context                                       |
| Host integration                       | `createVueHtmlTeleport(graph)`                                                                 | `getTeleport()`                                                       |
| Host scope                             | One mounted host per Graph; duplicate host rejected                                            | Module-wide host and entries; target IDs include graph identity       |
| Multiple graphs                        | Separate hosts can inherit different provider trees; identical node IDs tested                 | Graph identity distinguishes entries, but the host is shared          |
| Parent providers and global components | Verified through Teleport                                                                      | Available through its host-tree Teleport path                         |
| Directives and app plugin context      | Inherited through the Vue tree; individual integrations unverified                             | Same Vue-tree principle; validate individual integrations             |
| Extra component props                  | Node `props` supports updates and removal, retaining local state                               | No equivalent node `props` forwarding in the inspected view           |
| Component replacement                  | Different resolved component remounts; missing component removes content if no fallback exists | Its Vue render action unmounts before mounting the registry component |
| Geometry changes                       | Do not remount components                                                                      | SVG geometry does not itself invoke its Vue render action             |
| Forced remount                         | `keepAliveOnUpdate: false` on component/data/props render updates                              | No matching option                                                    |
| Reactive node data                     | `useX6NodeData(node)` subscribes to `change:data`                                              | No matching composable in the inspected exports                       |
| Data updates                           | Default preserves the component; components must consume reactive data explicitly              | Its Vue action map does not itself remount on `data` changes          |
| Live host switching                    | Unsupported; mount the host before nodes and keep it alive                                     | Do not assume runtime host switching is portable                      |

Using an HTML layer does **not** remove the need for Teleport. The layer chooses
the DOM location; the host preserves Vue ancestry. Without a host, registering
this package with `app.use(...)` does not transfer the app's providers or plugins
into standalone node apps. See [Vue context](./vue-context.md) for the mount order.

## Geometry, HTML and graph interactions

The official node markup is defined in its
[node implementation](https://unpkg.com/@antv/x6-vue-shape@3.0.2/es/node.js).
Its SVG content follows X6's coordinate system. This package recreates that
relationship for external HTML using the graph matrix and node-centered rotation.

| Capability                           | `x6-vue-html-shape`                                                                | Official approach / consequence                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| HTML rendering location              | Separate overlay; no `foreignObject` generated                                     | HTML inside SVG `foreignObject`                                  |
| Position and size changes            | Verified against actual SVG bounds                                                 | Content stays in its SVG node                                    |
| Zoom and pan                         | Shared inherited CSS matrix; verified                                              | Inherited SVG viewport transform                                 |
| Node rotation                        | Centered rotation; verified                                                        | Inherited node transform                                         |
| Nonuniform scale and affine matrix   | Verified, including a matrix with off-diagonal terms                               | Inherited SVG matrix                                             |
| Direct matrix/graph rotation changes | Viewport attribute observer; updates after the mutation callback                   | Applied in the SVG tree                                          |
| Unscaled content option              | `scaleContent: false`; transformed box retained, content laid out at screen scale  | No matching package option                                       |
| Custom mount target                  | `getContainer`; tested for containers sharing the graph origin                     | View mounts at its `foContent` target                            |
| Wrapper classes/styles               | Dynamic `htmlClassName`/`htmlStyle`, including removal                             | Style the Vue component and SVG markup                           |
| Node mouse dragging                  | Real browser drag and `node:moved` verified                                        | Native X6 NodeView path                                          |
| Input focus                          | Real browser focus/fill verified                                                   | Has a guard for several text-like input types                    |
| Buttons, links and editors           | Broader guard for controls, editable ancestors and `data-x6-vue-stop`; unit tested | Broader control guards are not present in the inspected override |
| Touch interaction                    | `touchstart` propagation guard unit tested                                         | No equivalent broad guard established by this source review      |
| Visibility                           | `visible` and dynamic `syncVisible` handling                                       | Visibility follows the SVG node                                  |
| Disable HTML pointer handling        | `interactive: false` makes HTML ignore pointer input                               | Configure node/component interaction in X6/Vue                   |
| SVG primer                           | Default transparent rect; accepts six SVG tag names                                | Optional primer behind Vue content                               |
| Path/polygon primer geometry         | Supply `d`/points through X6 attrs; selecting a tag is not a complete shape        | Custom SVG geometry also needs attributes                        |
| Popups                               | May overflow nodes, but the graph viewport clips them                              | Still subject to embedding, CSS and browser behavior             |

`interactive: false` is not a read-only graph switch. X6 SVG elements can still
receive events, and graph editing must be configured separately. A custom container
must share the graph's origin and positioning context; outside the graph container,
its content does not automatically receive X6's delegated pointer behavior.

Avoiding `foreignObject` removes the rendering path implicated in
[WebKit's layer-positioning report](https://bugs.webkit.org/show_bug.cgi?id=23113).
It is not proof that every Safari/iOS version or every complex CSS component works.
WebKit automation and Safari/iOS device acceptance are different forms of evidence.

## Editing ecosystem, layers and export

The official Vue package provides a node renderer; it does not itself implement
all X6 editing plugins or exporters. Its structural advantage is that Vue content
participates in the SVG scene. The separate-layer tradeoffs also appear in the
[X6 discussion of an HTML shape without foreignObject](https://github.com/antvis/X6/issues/3487).

| Capability                                | Current local status                                                      | Official comparison / required work                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| X6 model, edges and anchors               | Retained; examples create edges and tests check scene connections         | Both use X6 models; example edges are not a port-drag certification                      |
| HTML node-to-node z-index                 | CSS z-index mirrors the node value; complex equal-order cases unverified  | Official content participates in the SVG ordering system                                 |
| Arbitrary edge/node interleaving          | Unavailable across the fixed SVG/HTML layers                              | Keeping content in SVG avoids this separate-layer barrier                                |
| Ports and magnets                         | Keep in native SVG; must remain exposed to pointer input                  | HTML above SVG can obscure them even though the port model exists                        |
| Selection, tools, snaplines               | Unverified combinations and stacking behavior                             | Do not infer compatibility solely from NodeView inheritance                              |
| History/undo, clipboard, embedding        | Unverified complete workflows                                             | Models remain in X6, but Vue instance state is not automatically graph history           |
| Scroller and transformed outer containers | Unverified beyond the documented common-origin container case             | Additional coordinate/viewport integration may be required                               |
| Minimap and virtualization                | Unverified                                                                | External HTML content may need explicit view lifecycle or secondary-graph integration    |
| JSON serialization                        | Prefer shape registry plus serializable data/props; round-trip unverified | Component definitions, DOM containers and functions are not portable graph data          |
| Pure SVG export                           | Does not include external Vue content                                     | Official content is in SVG, but contains embedded HTML rather than native vectors        |
| PNG/JPEG export                           | No HTML-layer composition adapter implemented                             | SVG-based export needs browser/font/image/CSS validation even with the official renderer |
| SSR                                       | No server-rendered graph guarantee; initialize client-side                | This comparison establishes no official Vue-node SSR guarantee                           |

An export adapter would need to compose SVG and HTML and define handling of
fonts, images, async components and resources. Arbitrary cross-layer ordering
requires a separate rendering design. Neither is solved by renaming the package,
enabling Teleport or adding a synchronization listener.

## Performance: what is known

| Work                                 | Current implementation                                                          | What the comparison establishes                                       |
| ------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Normal-node pan/zoom synchronization | One layer CSS-variable write when the matrix changes; no normal-node style loop | Reduces this package's JavaScript synchronization work                |
| Browser rendering after that write   | Descendants still resolve styles, compose transforms and paint                  | Does not establish O(1) total rendering cost or an FPS lead           |
| Special node transforms              | Individual callbacks for custom containers and unscaled content                 | Cost depends on the number of those nodes                             |
| Node/data/props updates              | Local updates; some graph events can still request a full refresh               | Not every operation is constant-time                                  |
| Initial Vue mount                    | Standalone apps or a shared host                                                | No measured winner against official standalone/Teleport modes         |
| Current regression check             | 100 normal nodes; pan/zoom must not mutate their individual style attributes    | Tests update behavior, not frame rate or a supported node-count limit |
| Memory and long sessions             | Disposal paths tested                                                           | No comparative heap-retention or long-session benchmark published     |

There is currently **no measured claim that this package is faster or lighter**
than the official renderer. A useful benchmark must use the same components,
edges, data, hardware and browser versions, and compare both standalone and host
mounting. Measure initial mount, data updates, pan/zoom frame times and memory
after repeated graph disposal. Native SVG rectangles and text can have less work
than complex Vue cards, but that is a different comparison from two Vue renderers.

## Validation and adoption

The local baseline checked on 2026-09-14 has **45 unit tests** and **six browser
scenarios run in three engines (18 executions)**. Chromium, Firefox and WebKit
cover real geometry, dragging, container changes, shared transforms, Vue providers,
input focus and disposal. This does not describe the official package's test count
or establish equal maturity. Exact test files and remaining criteria are listed in
[production readiness](./production-readiness.md).

Choose this implementation for a Vue 3/X6 3 application that specifically needs
HTML overlay rendering and accepts its export/layering boundaries. Retain the
official renderer when Vue 2 support or the SVG-integrated scene is important,
unless you have verified a replacement for the required workflows.

Before adopting either renderer, validate the actual business components and
plugin combinations. For this package, begin with a prerelease or controlled
application trial; comparative performance and broad plugin coverage remain open.
Use the [migration guide](./migration.md) instead of a package-name-only replacement.
