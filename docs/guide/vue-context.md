# Share Vue context

By default, each HTML node is mounted as an independent Vue application. It gets
`node`/`graph` props and `getNode`/`getGraph` injection, but does not inherit the
application that created the graph.

Use `createVueHtmlTeleport(graph)` when nodes need scoped providers, global
components, directives, or application plugin context. The returned component
must be mounted below the relevant providers before adding nodes.

## Mount order

This example is for a client-rendered Vue application. Register the node shape
once in your application's initialization module:

```ts
import { registerVueHtmlNode } from 'x6-vue-html-shape'
import UserNode from './UserNode.vue'

registerVueHtmlNode({ shape: 'user-node', component: UserNode })
```

The graph component owns the graph and its Teleport host:

```vue
<script setup lang="ts">
import { Graph } from '@antv/x6'
import { nextTick, onBeforeUnmount, onMounted, provide, shallowRef } from 'vue'
import type { Component } from 'vue'
import { createVueHtmlTeleport, setupVueHtmlShapeSync } from 'x6-vue-html-shape'
import 'x6-vue-html-shape/style.css'

const container = shallowRef<HTMLElement | null>(null)
const teleportHost = shallowRef<Component | null>(null)
let graph: Graph | undefined

provide('workspaceName', 'Operations')

onMounted(async () => {
  if (!container.value) return

  const instance = new Graph({
    container: container.value,
    width: 800,
    height: 500,
  })
  graph = instance
  setupVueHtmlShapeSync(instance)
  teleportHost.value = createVueHtmlTeleport(instance)

  // Let the host register itself before any node chooses a mounting strategy.
  await nextTick()
  if (graph !== instance) return

  instance.addNode({
    shape: 'user-node',
    x: 80,
    y: 80,
    width: 220,
    height: 100,
    data: { name: 'Alice' },
  })
})

onBeforeUnmount(() => {
  // Dispose nodes while the host still exists; Vue then unmounts the host.
  graph?.dispose()
  graph = undefined
})
</script>

<template>
  <div ref="container" />
  <component
    v-if="teleportHost"
    :is="teleportHost"
  />
</template>
```

`UserNode.vue` can now call `inject('workspaceName')`. Global components resolve
through the app that renders the host. Providers inside some unrelated component
subtree are not ancestors of the host and therefore do not become available.

## Lifecycle contract

- Create a host per graph. Two graphs can use identical node IDs and different
  provider trees. Shape/component registration itself remains shared.
- Only one host can be mounted per graph. Mounting a second throws an error.
- Keep the host mounted for the graph lifetime. Nodes created before it mounts
  use standalone apps; mounting a host later does not migrate those live nodes.
- Removing or replacing a node removes its host entry. Vue processes Teleport
  updates asynchronously; await `nextTick()` before inspecting resulting DOM or
  component teardown hooks.
- Dispose the graph before removing the host. Toggling hosts for live nodes is
  outside the supported contract.

The optional `createVueHtmlShapePlugin()` handles shape registration and style
injection. It neither enables graph synchronization nor creates a Teleport host.
The same applies to the default `install` export.

## Popup Teleport is a separate choice

The node host preserves Vue ancestry while sending node DOM into the graph's HTML
layer. A dropdown or tooltip may still need its own Teleport target outside the
clipped graph viewport. Configure that on the UI component; enabling the node
host does not automatically reposition its popups.

## SSR applications

Create Graph instances and mount node hosts only on the client. If server-side
module evaluation reaches browser-dependent X6 code, defer those imports or load
the graph component through your framework's client-only entry mechanism. This
package does not claim server-rendered graphs or hydration compatibility.
