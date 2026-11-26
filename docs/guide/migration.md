# Migrate from the official Vue shape

This guide targets `@antv/x6-vue-shape@3.0.2` with X6 3 and Vue 3.3 or later in the
Vue 3 major. Read the [capability comparison](./comparison.md) first if you depend
on image export, Vue 2, mixed edge/node ordering or X6 editing plugins.

## Map APIs and setup

| Official usage                               | Local replacement                                        | Difference                                                             |
| -------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| `register({ shape, component })`             | `registerVueHtmlNode({ shape, component })`              | Local registration rejects duplicates unless `overwrite: true`         |
| Additional defaults in `register(...)`       | `registerVueHtmlNode({ shape, component, ...defaults })` | X6 node configuration is forwarded and the HTML view is assigned       |
| `getTeleport()`                              | `createVueHtmlTeleport(graph)`                           | One host per graph, mounted before nodes                               |
| Automatic `vue-shape` registration on import | `registerVueHtmlShapeNode(...)`                          | Explicit registration, default name `vue-html-shape`                   |
| SVG-native transform inheritance             | `setupVueHtmlShapeSync(graph)`                           | Required to follow graph transforms                                    |
| Styling inside Vue nodes                     | Same Vue styles plus package `style.css`                 | SVG selectors targeting `fo`/`foContent` no longer address Vue content |
| Node data event subscription                 | `useX6NodeData(node)` or your own subscription           | The helper is a shallow, one-way subscription                          |

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

Pass shared X6 defaults directly to the registration function. Use `inherit`
when the shape should start from an existing X6 node definition.

```ts
import { registerVueHtmlNode } from 'x6-vue-html-shape'
import UserNode from './UserNode.vue'

registerVueHtmlNode({
  shape: 'user-node',
  component: UserNode,
  inherit: 'rect',
  width: 220,
  height: 100,
  ports: [{ id: 'out' }],
})
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

## Keep native ports reachable

Keep port definitions and magnets in X6. The Vue card sits above the SVG, so
check both where the port is painted and what receives the pointer.

### Place the entire port outside the card

For an output on the right or bottom edge, offset the port outwards from its
X6 layout position. Leave enough clearance for the full magnet, including its
stroke or any larger hit area. Reverse the offset for left or top ports.
This example uses a 6 px radius and 1 px stroke.

```ts
import { registerVueHtmlNode } from 'x6-vue-html-shape'
import TaskCard from './TaskCard.vue'

const output = {
  attrs: {
    circle: {
      r: 6,
      strokeWidth: 1,
      magnet: true,
    },
  },
}

registerVueHtmlNode({
  shape: 'task-node',
  component: TaskCard,
  width: 180,
  height: 100,
  ports: {
    groups: {
      right: { ...output, position: 'right' },
      bottom: { ...output, position: 'bottom' },
    },
    items: [
      {
        id: 'out-right',
        group: 'right',
        args: {
          dx: 10,
        },
      },
      {
        id: 'out-bottom',
        group: 'bottom',
        args: {
          dy: 10,
        },
      },
    ],
  },
})
```

Use the item-level `args` for these offsets. Leave room between neighboring
cards and at the graph viewport edge so the offset ports remain exposed.

### Let inset ports receive pointer events

If a port must sit inside the HTML wrapper, set `interactive: false` in the
shape defaults or on the node instance. The wrapper then lets the event reach
the SVG magnet. Set `pointer-events: auto` on the individual controls and the
drag handle. Keep those elements clear of the magnet.

For the `task-node` defined above, move `out-right` inside the wrapper and
reserve a 26 px transparent strip on that side of the card.

```ts
const node = graph.addNode({
  shape: 'task-node',
  x: 80,
  y: 70,
  interactive: false,
})
node.setPortProp('out-right', 'args/dx', -16)
```

Put the card background on the inset surface so the SVG port is visible through
the strip.

```vue
<template>
  <div class="card-surface">
    <div class="drag-handle">Drag task</div>
    <button type="button">Run</button>
    <input aria-label="Task name" />
  </div>
</template>

<style scoped>
.card-surface {
  position: absolute;
  inset: 0 26px 0 0;
  background: white;
}

.drag-handle,
button,
input {
  pointer-events: auto;
}

.drag-handle {
  cursor: move;
}
</style>
```

The library's built-in interaction guard lets buttons and inputs handle their
own mouse and touch events. Mark custom controls with `data-x6-vue-stop` when
they need the same protection. Leave that attribute off the drag handle so
X6 receives its drag events.

## Connect X6 MiniMap

X6 MiniMap creates a second graph that shares the main graph's model and has its
own viewport. Choose how that graph renders your Vue shapes. The examples below
assume `task-node` has already been registered. [X6 MiniMap documentation](https://x6.antv.antgroup.com/en/tutorial/plugins/minimap)

### Render Vue cards in the minimap

Call `setupVueHtmlShapeSync` on the graph returned by `MiniMap.createGraph`.
This keeps the preview's HTML cards aligned with its SVG viewport at the
preview's zoom and pan. When a card uses app providers such as i18n, render one
Teleport host per graph under the providers and wait for both to mount before
adding or loading nodes.

```vue
<script setup lang="ts">
import { Graph, MiniMap } from '@antv/x6'
import { nextTick, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import type { Component } from 'vue'
import { createVueHtmlTeleport, setupVueHtmlShapeSync } from 'x6-vue-html-shape'
import 'x6-vue-html-shape/style.css'

const canvas = shallowRef<HTMLElement>()
const minimap = shallowRef<HTMLElement>()
const mainHost = shallowRef<Component>()
const minimapHost = shallowRef<Component>()

let graph: Graph | undefined

onMounted(async () => {
  if (!canvas.value || !minimap.value) return

  const instance = new Graph({
    container: canvas.value,
    width: 640,
    height: 420,
  })
  graph = instance
  setupVueHtmlShapeSync(instance)
  mainHost.value = createVueHtmlTeleport(instance)
  instance.use(
    new MiniMap({
      container: minimap.value,
      graphOptions: { async: true },
      createGraph(options) {
        const preview = new Graph(options)

        setupVueHtmlShapeSync(preview)
        minimapHost.value = createVueHtmlTeleport(preview)

        return preview
      },
    }),
  )

  await nextTick()
  if (graph !== instance) return

  instance.addNode({ shape: 'task-node', x: 80, y: 70 })
})

onBeforeUnmount(() => {
  graph?.dispose()
  graph = undefined
})
</script>

<template>
  <div ref="canvas" />
  <div
    ref="minimap"
    class="diagram-minimap"
  />
  <component
    :is="mainHost"
    v-if="mainHost"
  />
  <component
    :is="minimapHost"
    v-if="minimapHost"
  />
</template>

<style scoped>
.diagram-minimap :deep(.x6-vue-html-node),
.diagram-minimap :deep(.x6-vue-html-node *) {
  pointer-events: none !important;
}
</style>
```

The preview CSS keeps pointer events available to the minimap. For editable
cards, render a static preview when the component's `graph` prop is the
secondary graph so its controls also stay out of keyboard navigation.

For toggling, call `graph.disposePlugins('minimap')` before removing the preview
host. X6 disposes the secondary graph and keeps the shared model live. Let Vue
process the host removal with `await nextTick()`. On reopening, mount a new
`MiniMap` with a fresh host. Keep `async: true` so X6 queues the initial preview
render for a populated model, and await `nextTick()` before making model changes
so the new host can mount first.

### Render SVG outlines in the minimap

For a lightweight preview, override the view through
`MiniMap.graphOptions.createCellView`. The example draws a visible rectangle at
the node's model size and leaves the default X6 views in place for other nodes
and edges. List each of your Vue shape names in the hook.

```ts
import { MiniMap, NodeView } from '@antv/x6'
import type { CellAttrs } from '@antv/x6'

class MiniMapOutlineView extends NodeView {
  protected override renderMarkup() {
    this.renderJSONMarkup({
      tagName: 'rect',
      selector: 'minimapBody',
      attrs: { fill: '#dbeafe', stroke: '#2563eb' },
    })
  }

  override update(partialAttrs?: CellAttrs) {
    super.update(partialAttrs)
    const { width, height } = this.cell.getSize()
    const body = this.findOne('minimapBody', this.container, this.selectors)!

    body.setAttribute('width', String(width))
    body.setAttribute('height', String(height))
  }
}

graph.use(
  new MiniMap({
    container: minimapContainer,
    graphOptions: {
      createCellView(cell) {
        return cell.isNode() && cell.shape === 'task-node'
          ? MiniMapOutlineView
          : undefined
      },
    },
  }),
)
```

Set up HTML synchronization and any needed Vue host on the main graph. Remove
or recreate the SVG preview through the same X6 plugin lifecycle.

## Validate migrated behavior

Check native dragging, input focus, touch, node visibility, rotation, pan/zoom,
reactive data, popup placement and component teardown in the target application.
Then validate every required X6 plugin and your export path. Existing JSON data
still requires its shape registry to be available before loading.

For exports that need card content, provide a static representation through
the [SVG and PNG export hook](./export.md). Account for the fixed SVG/HTML
layer order when validating the editor.

The official API mappings above are based on its published
[registry](https://unpkg.com/@antv/x6-vue-shape@3.0.2/es/registry.js),
[view](https://unpkg.com/@antv/x6-vue-shape@3.0.2/es/view.js) and
[Teleport](https://unpkg.com/@antv/x6-vue-shape@3.0.2/es/teleport.js) implementations.
