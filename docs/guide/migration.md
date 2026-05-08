# Migrate from the official Vue shape

This guide targets `@antv/x6-vue-shape@3.0.2` with X6 3 and Vue 3.3 or later in the
Vue 3 major. Read the [capability comparison](./comparison.md) first if you depend
on image export, Vue 2, mixed edge/node ordering or X6 editing plugins.

## Map APIs and setup

| Official usage                               | Local replacement                                               | Difference                                                             |
| -------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `register({ shape, component })`             | `registerVueHtmlNode({ shape, component })`                     | Local registration rejects duplicates unless `overwrite: true`         |
| Additional defaults in `register(...)`       | `Graph.registerNode(...)` plus `registerVueShapeComponent(...)` | The local shortcut does not forward arbitrary X6 metadata              |
| `getTeleport()`                              | `createVueHtmlTeleport(graph)`                                  | One host per graph, mounted before nodes                               |
| Automatic `vue-shape` registration on import | `registerVueHtmlShapeNode(...)`                                 | Explicit registration, default name `vue-html-shape`                   |
| SVG-native transform inheritance             | `setupVueHtmlShapeSync(graph)`                                  | Required to follow graph transforms                                    |
| Styling inside Vue nodes                     | Same Vue styles plus package `style.css`                        | SVG selectors targeting `fo`/`foContent` no longer address Vue content |
| Node data event subscription                 | `useX6NodeData(node)` or your own subscription                  | The helper is a shallow, one-way subscription                          |

The current development version is `0.0.0`. The npm registry did not expose a
`latest` release for `x6-vue-html-shape` when checked on 2026-09-14. Until a release
is published, use the repository workspace or a locally built package as explained
in [Getting Started](./getting-started.md).

## Register component-only shapes

For a simple registration, change:

```ts
import { register } from '@antv/x6-vue-shape'
import UserNode from './UserNode.vue'

register({ shape: 'user-node', component: UserNode })
```

to:

```ts
import { registerVueHtmlNode } from 'x6-vue-html-shape'
import 'x6-vue-html-shape/style.css'
import UserNode from './UserNode.vue'

registerVueHtmlNode({ shape: 'user-node', component: UserNode })
```

Keep width, height, data and port definitions in `graph.addNode(...)` when you do
not need shared defaults. Register shapes once; use `overwrite: true` only when
you intend to replace an existing registration.

## Preserve inherited node defaults

The official `register` forwards additional metadata. The local convenience
function only accepts shape, component, primer and overwrite options. For shared
X6 defaults, register the base shape and a derived shape explicitly:

```ts
import { Graph } from '@antv/x6'
import {
  registerVueHtmlShapeNode,
  registerVueShapeComponent,
} from 'x6-vue-html-shape'
import UserNode from './UserNode.vue'

registerVueHtmlShapeNode()
Graph.registerNode('user-node', {
  inherit: 'vue-html-shape',
  width: 220,
  height: 100,
  // Put shared X6 attrs/ports and other model defaults here.
})
registerVueShapeComponent('user-node', UserNode)
```

Do not carry over `view: 'vue-shape-view'`, `fo`/`foContent` attributes or a custom
markup tree containing `foreignObject`. Keep necessary SVG port/primer markup and
adapt the Vue content's CSS independently.

## Enable synchronization and context

After creating the graph, call `setupVueHtmlShapeSync(graph)`. It returns an
idempotent disposer, and `graph.dispose()` also performs cleanup automatically.
Stopping synchronization alone does not dispose node components or the graph.

Replace a shared official `getTeleport()` host with a graph-specific host. Follow
the complete [Vue context example](./vue-context.md), including the `nextTick()`
before adding nodes. Without that host, nodes intentionally use standalone apps.

## Keep the `vue-shape` name only when needed

```ts
import { registerVueHtmlShapeNode } from 'x6-vue-html-shape'

registerVueHtmlShapeNode({
  compatibleShapeName: true,
  overwrite: true,
})
```

This registers both `vue-html-shape` and `vue-shape` for the HTML renderer. Inline
`component` metadata can be used with these shapes, or bind a component through
`registerVueShapeComponent`. For serialized graphs, prefer registry-bound
components and serializable data rather than functions or component objects.

The alias does not reproduce the official `register`, `getTeleport`, internal
view name, export behavior or DOM structure. Avoid importing both packages to
compete for `vue-shape`: register distinct names if both renderers must coexist.

## Validate migrated behavior

Check native dragging, input focus, touch, node visibility, rotation, pan/zoom,
reactive data, popup placement and component teardown in the target application.
Then validate every required X6 plugin and your export path. Existing JSON data
still requires its shape registry to be available before loading.

For this release line, plain SVG/image exports omit HTML node content and arbitrary
SVG/HTML layer interleaving is unavailable. Treat these as adoption constraints,
not as settings that can be enabled after migration.

The official API mappings above are based on its published
[registry](https://unpkg.com/@antv/x6-vue-shape@3.0.2/es/registry.js),
[view](https://unpkg.com/@antv/x6-vue-shape@3.0.2/es/view.js) and
[Teleport](https://unpkg.com/@antv/x6-vue-shape@3.0.2/es/teleport.js) implementations.
