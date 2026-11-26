# Export Vue shape cards as SVG or PNG

Use `createVueHtmlSvgExportHook` with X6's Export plugin to give Vue shapes a
static representation in SVG and PNG. X6 exports its SVG scene, and the hook
adds your SVG cards to a copy of that scene. Each card inherits its X6 node's
position and rotation. Edges, ports and ordinary SVG nodes keep their X6 views.

Choose a card language in the [Case Flow playground](../examples/case-flow.md)
and download either format. Both exports use the language selected when you
click Export.

```ts
import { Export } from '@antv/x6'
import { createVueHtmlSvgExportHook } from 'x6-vue-html-shape'
import type { VueHtmlSvgNodeRenderer } from 'x6-vue-html-shape'

const renderCard: VueHtmlSvgNodeRenderer = (node, doc) => {
  if (node.shape !== 'task-node') return

  const ns = 'http://www.w3.org/2000/svg'
  const card = doc.createElementNS(ns, 'g')
  const rect = doc.createElementNS(ns, 'rect')
  const label = doc.createElementNS(ns, 'text')
  const { width, height } = node.size()

  rect.setAttribute('width', String(width))
  rect.setAttribute('height', String(height))
  rect.setAttribute('rx', '8')
  rect.setAttribute('fill', '#dbeafe')
  label.setAttribute('x', '12')
  label.setAttribute('y', '24')
  label.setAttribute('fill', '#172554')
  label.textContent = node.getData<{ title?: string }>()?.title ?? 'Task'
  card.append(rect, label)

  return card
}

// Install once on your existing graph.
graph.use(new Export())

function downloadSvg() {
  graph.exportSVG('tasks', {
    beforeSerialize: createVueHtmlSvgExportHook(graph, renderCard),
    viewBox: graph.getContentBBox(),
    preserveDimensions: true,
  })
}

function downloadPng() {
  graph.exportPNG('tasks', {
    beforeSerialize: createVueHtmlSvgExportHook(graph, renderCard),
    viewBox: graph.getContentBBox(),
    padding: 12,
    ratio: 2,
  })
}
```

Create a new hook immediately before each export, after any graph updates you
want to include. The factory renders, validates and copies cards synchronously
so edits during X6's image serialization leave the captured cards intact.
Return `undefined` or `null` to keep a node's original SVG representation.
With X6 virtualization, export from a graph that has rendered all the views you
want in the image.

Build the card with SVG elements and inline presentation attributes. Draw from
`(0, 0)` using the node's model dimensions. The result captures the data and
appearance supplied by your renderer. For images inserted by the renderer,
prepare data URLs ahead of time because X6 embeds its own images before calling
the hook. A custom `viewBox` uses the exported SVG viewport's coordinate system.
Allow extra space around the content if ports or decorations protrude.

The factory accepts pure SVG cards and rejects `foreignObject` synchronously.
To reproduce live HTML styling and controls pixel for pixel, capture the
rendered graph in a browser. [X6 Export plugin](https://x6.antv.vision/en/tutorial/plugins/export/)
