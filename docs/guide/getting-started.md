# Getting Started

`x6-vue-html-shape` renders Vue 3 components in an HTML overlay while X6 owns
nodes, edges and graph interaction. It supports Vue `^3.3.0` and X6 `^3.0.0`;
there is no Vue 2 or X6 2 compatibility declaration.

## Current availability

The current checkout is version `0.0.0`. On 2026-09-14, npm returned no `latest`
release for this package name. Start with the local workspace:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm docs:dev
```

To try it in another project, run `pnpm pack` after building, then install the
resulting tarball there with `pnpm add /path/to/x6-vue-html-shape-0.0.0.tgz`.
Install the compatible Vue and X6 peer dependencies in that project as well.

Once a release is published, the registry installation command is:

```bash
pnpm add x6-vue-html-shape @antv/x6 vue
```

## Register a node shape

Register once during client-side application initialization. Importing the
package registers its view implementation, but does not register the base shape
or inject styles automatically.

```ts
import { registerVueHtmlNode } from 'x6-vue-html-shape'
import 'x6-vue-html-shape/style.css'
import UserNode from './UserNode.vue'

registerVueHtmlNode({
  shape: 'user-node',
  component: UserNode,
})
```

Duplicate shape names are rejected by default. Use `overwrite: true` when
intentionally replacing a registration. The shortcut accepts `shape`, `component`,
`primer` and `overwrite`; put node dimensions and other X6 metadata on the node,
or use the [inherited-defaults migration pattern](./migration.md#preserve-inherited-node-defaults).

## Create the graph and enable synchronization

Run this after the container exists, for example in a Vue `onMounted` callback:

```ts
import { Graph } from '@antv/x6'
import { setupVueHtmlShapeSync } from 'x6-vue-html-shape'

const container = document.getElementById('container')
if (!container) throw new Error('Missing graph container')

const graph = new Graph({
  container,
  width: 800,
  height: 500,
  grid: true,
})

setupVueHtmlShapeSync(graph)

graph.addNode({
  shape: 'user-node',
  x: 80,
  y: 80,
  width: 240,
  height: 100,
  data: { name: 'Alice' },
})

// Call graph.dispose() when the owning page/component is unmounted.
```

Provide explicit node sizes; this package does not automatically resize the X6
model from the Vue component's intrinsic content size. Graph disposal also removes
synchronization subscriptions and mounted node views. The returned sync disposer
only stops synchronization; it is not a replacement for `graph.dispose()`.

## Read and update node data

A minimal `UserNode.vue`:

```vue
<script setup lang="ts">
import type { Node } from '@antv/x6'
import { useX6NodeData } from 'x6-vue-html-shape'

const props = defineProps<{ node: Node }>()
const data = useX6NodeData<{ name: string }>(props.node)

function rename() {
  props.node.setData({ name: 'Bob' })
}
</script>

<template>
  <div>
    <span>{{ data.name }}</span>
    <button @click="rename">Rename</button>
  </div>
</template>
```

The helper listens for `change:data` and unsubscribes before component unmount.
It returns a shallow ref, not a two-way binding. Write through `node.setData(...)`;
mutating `data.value` or an arbitrary nested property does not by itself update
X6 or guarantee a render. Initialize the expected data fields on every node.

Buttons, inputs, links, editable content and `data-x6-vue-stop` descendants are
protected from graph mousedown/touchstart handling. This protection does not disable
all graph keyboard or wheel behavior.

## Choose how Vue context is shared

Without a host, nodes use independent Vue applications. For application providers,
global components and plugin context, mount `createVueHtmlTeleport(graph)` before
adding nodes. Follow the complete [Vue context example](./vue-context.md), including
its `nextTick()` and graph disposal order.

The optional `createVueHtmlShapePlugin()` registers shapes and can inject styles.
It does not create the graph, enable graph synchronization or mount a context host.
For SSR applications, keep the graph component and browser-dependent imports
client-side; server-rendered graph content is not a supported contract.

## Next steps

- [Detailed official-package comparison](./comparison.md)
- [Migration from the official package](./migration.md)
- [Complete API](/api/index)
- [Production readiness and test coverage](./production-readiness.md)
- [Interactive examples](/examples/text-node)
