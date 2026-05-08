# x6-vue-html-shape

Render Vue components as X6 nodes without SVG `foreignObject`.

Targets **Vue `^3.3.0` and X6 `^3.0.0`**. The current development version is
`0.0.0`; npm did not expose a `latest` release under this name when checked on
2026-09-14. The implementation is ready for controlled evaluation within its
documented limits, not a claim of full official-package parity.

## Why

`@antv/x6-vue-shape` mounts Vue inside SVG `foreignObject`, a rendering path with
reported Safari/WebKit positioning issues for complex HTML/CSS. This package
avoids that path; specific Safari/iOS versions still need application-level testing.

This package renders Vue nodes into an HTML overlay layer while keeping X6 in charge of graph editing behaviors.

## Install

For the current unpublished checkout, use the local workspace:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm docs:dev
```

After a registry release is available:

```bash
pnpm add x6-vue-html-shape @antv/x6 vue
```

For local tarball installation, see [Getting Started](docs/guide/getting-started.md).

## Compared with the official package

Comparison baseline: **`@antv/x6-vue-shape@3.0.2`**, checked on 2026-09-14.

| Area                    | This package                                               | Official package                                                  |
| ----------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Rendering               | HTML overlay plus X6 SVG nodes                             | Vue HTML inside SVG `foreignObject`                               |
| Vue versions            | Vue 3.3+ within Vue 3                                      | Declares Vue 2 and Vue 3 support                                  |
| Vue context             | Optional graph-specific Teleport host                      | Optional shared `getTeleport()` host                              |
| Graph transforms        | Shared CSS matrix; explicit sync setup                     | SVG transform inheritance                                         |
| Registration shortcut   | Narrow options; duplicates rejected by default             | Forwards node defaults; overwrites                                |
| Content scale           | Supports `scaleContent: false`                             | No matching option in the inspected renderer                      |
| Export and mixed layers | HTML omitted from SVG export; cross-layer ordering limited | Content remains in the SVG scene, subject to export compatibility |
| Performance             | No comparative benchmark or node-count guarantee           | No measured ranking established by this review                    |

The [detailed comparison](docs/guide/comparison.md) covers registration, state,
context, controls, transforms, ports, editing plugins, exports, performance and
test evidence, with links to the versioned official sources. Use the
[migration guide](docs/guide/migration.md) for API and setup differences.

## Basic usage

```ts
import { Graph } from '@antv/x6'
import { registerVueHtmlNode, setupVueHtmlShapeSync } from 'x6-vue-html-shape'
import 'x6-vue-html-shape/style.css'
import UserNode from './UserNode.vue'

registerVueHtmlNode({
  shape: 'user-node',
  component: UserNode,
})

const graph = new Graph({
  container: document.getElementById('container')!,
})

const disposeSync = setupVueHtmlShapeSync(graph)

graph.addNode({
  shape: 'user-node',
  x: 100,
  y: 100,
  width: 220,
  height: 80,
  data: { name: 'x6' },
})

// Stop synchronization early with disposeSync(), if needed.
// Call graph.dispose() when the owning page/component is unmounted.
```

`graph.dispose()` also disposes synchronization automatically. Repeated calls to
`setupVueHtmlShapeSync` reuse the same subscription; dispose it before changing
sync options.

## Share the Vue application context

Use `createVueHtmlTeleport(graph)` to render nodes inside the host application's
Vue tree. Mount its returned component below your providers **before adding
nodes**, and keep it mounted until the graph is disposed:

```ts
import { createVueHtmlTeleport } from 'x6-vue-html-shape'

const TeleportContainer = createVueHtmlTeleport(graph)
// Render <TeleportContainer /> in your Vue application.
// After it has mounted, add graph nodes.
```

Each graph has its own host. Nodes inherit scoped providers, global components,
directives and application plugin context. Without a host, nodes use standalone
Vue apps. Installing this package as an app plugin only registers shapes/styles;
it does not implicitly share that application's context.

See the [complete Vue context example](docs/guide/vue-context.md) for host mounting,
`nextTick()` and teardown order.

## Validation

```bash
pnpm release:check
pnpm build
pnpm exec playwright install chromium firefox webkit
pnpm test:browser
```

The current baseline has **45 unit tests** and **six browser scenarios executed
in Chromium, Firefox and WebKit (18 executions)**. They cover geometry, real mouse
dragging, input focus, context, special containers and disposal. The 100-node
style-update check is not an FPS benchmark or a supported node-count limit. See
[production readiness](docs/guide/production-readiness.md) for supported behavior,
remaining release criteria and architectural limitations.

## Compatibility mode (`vue-shape`)

```ts
import {
  registerVueHtmlShapeNode,
  setupVueHtmlShapeSync,
} from 'x6-vue-html-shape'
import 'x6-vue-html-shape/style.css'

registerVueHtmlShapeNode({
  compatibleShapeName: true,
  overwrite: true,
})

setupVueHtmlShapeSync(graph)
```

Then existing nodes can keep using:

```ts
graph.addNode({
  shape: 'vue-shape',
  component: MyNode,
})
```

## API

- `registerVueHtmlShapeNode(options)` register default shape (`vue-html-shape`) and optional compatible shape (`vue-shape`).
- `registerVueHtmlNode(options)` convenience API for shape + component registration.
- `registerVueShapeComponent(shape, component)` register component by shape name.
- `setupVueHtmlShapeSync(graph)` synchronize node HTML overlays with graph transform and node changes.
- `useX6NodeData(node)` reactive helper for `node.getData()` updates in Vue components.
- `createVueHtmlTeleport(graph)` create a graph-specific Vue context host.

## Limitations

- HTML nodes are rendered in a separate overlay layer, not inside SVG.
- Exporting pure SVG does not include HTML node content.
- Interleaving z-index ordering between SVG edges and HTML nodes is limited.
- Ports/magnets should remain in native X6 SVG nodes.
- Popups may overflow a node, but remain clipped by the graph viewport. Teleport
  popups to an external overlay when they must escape it.
- Custom containers must share the graph container's coordinate origin and
  positioning context. Containers outside the graph do not receive X6's delegated
  pointer events automatically.
- Selection/history/scroller/minimap/virtualization combinations, real iOS touch
  and comparative performance remain unverified. See the
  [production readiness matrix](docs/guide/production-readiness.md).
- Node dimensions come from X6; intrinsic Vue content size does not automatically
  resize the model. `safariSafe` and `throttle` are reserved fields with no effect.

## License

MIT
