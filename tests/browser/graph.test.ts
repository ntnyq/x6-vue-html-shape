import { Graph } from '@antv/x6'
import type { Node } from '@antv/x6'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import {
  createApp,
  defineComponent,
  h,
  inject,
  nextTick,
  onUnmounted,
  provide,
} from 'vue'
import type { App } from 'vue'
import {
  createVueHtmlTeleport,
  registerVueHtmlNode,
  setupVueHtmlShapeSync,
  unregisterVueShapeComponent,
} from '../../src'
import '../../src/style.css'

const graphs: Graph[] = []
const apps: App[] = []
const containers: HTMLElement[] = []
const shapes: string[] = []

async function nextFrame() {
  // Browser layout and MutationObserver callbacks must complete before assertions.
  // oxlint-disable-next-line promise/avoid-new
  await new Promise(requestAnimationFrame)
}

afterEach(async () => {
  graphs.splice(0).forEach(graph => graph.dispose())
  await nextTick()
  apps.splice(0).forEach(app => app.unmount())
  containers.splice(0).forEach(container => container.remove())
  shapes.splice(0).forEach(shape => {
    Graph.unregisterNode(shape)
    unregisterVueShapeComponent(shape)
  })
})

function createGraph() {
  const container = document.createElement('div')
  container.style.cssText = 'position: relative; width: 800px; height: 600px;'
  document.body.append(container)
  containers.push(container)
  const graph = new Graph({ container, width: 800, height: 600, async: false })
  graphs.push(graph)
  setupVueHtmlShapeSync(graph)
  return graph
}

function register(
  component = defineComponent(
    () => () =>
      h('div', { style: 'width:100%;height:100%;background:#ccd' }, 'Node'),
  ),
) {
  const shape = `browser-node-${shapes.length}`
  shapes.push(shape)
  registerVueHtmlNode({ shape, component })
  return shape
}

function getRoot(graph: Graph, node: Node) {
  const root = graph.container.querySelector<HTMLElement>(
    `.x6-vue-html-node[data-cell-id="${node.id}"]`,
  )
  if (!root) {
    throw new Error('Missing HTML node')
  }
  return root
}

function expectAligned(graph: Graph, node: Node) {
  const body = graph.findViewByCell(node)?.container.querySelector('rect')
  if (!body) {
    throw new Error('Missing SVG node body')
  }
  const svg = body.getBoundingClientRect()
  const html = getRoot(graph, node).getBoundingClientRect()
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(Math.abs(svg[key] - html[key])).toBeLessThan(0.5)
  }
}

describe('real X6 graph integration', () => {
  it('drags an HTML node through native X6 event delegation', async () => {
    const graph = createGraph()
    const node = graph.addNode({
      shape: register(),
      x: 100,
      y: 80,
      width: 160,
      height: 90,
    })
    const moved = vi.fn()
    graph.on('node:moved', moved)
    await userEvent.dragAndDrop(getRoot(graph, node), graph.container, {
      sourcePosition: { x: 20, y: 20 },
      targetPosition: { x: 350, y: 250 },
    })
    await nextFrame()
    expect(node.position().x).toBeGreaterThan(100)
    expect(node.position().y).toBeGreaterThan(80)
    expect(moved).toHaveBeenCalledWith(expect.objectContaining({ node }))
    expectAligned(graph, node)
  })

  it('keeps unscaled and custom-container nodes aligned after runtime changes', () => {
    const graph = createGraph()
    const node = graph.addNode({
      shape: register(),
      x: 100,
      y: 80,
      width: 160,
      height: 90,
      scaleContent: false,
    })
    node.rotate(35)
    graph.scale(1.5, 0.75)
    graph.translate(25, 35)
    expectAligned(graph, node)
    node.setProp('scaleContent', true)
    expectAligned(graph, node)
    const custom = document.createElement('div')
    custom.style.cssText = 'position:absolute;inset:0;pointer-events:none;'
    graph.container.append(custom)
    node.setProp('getContainer', () => custom)
    expect(getRoot(graph, node).parentElement).toBe(custom)
    setupVueHtmlShapeSync(graph)()
    setupVueHtmlShapeSync(graph)
    graph.translate(30, 40)
    expectAligned(graph, node)
    node.removeProp('getContainer')
    graph.scale(0.8)
    expectAligned(graph, node)
  })

  it('aligns SVG and HTML through rotation, resize, nonuniform scaling and direct matrix changes', async () => {
    const graph = createGraph()
    const node = graph.addNode({
      shape: register(),
      x: 100,
      y: 80,
      width: 160,
      height: 90,
    })
    expectAligned(graph, node)
    node.rotate(35)
    node.resize(190, 110)
    node.position(130, 100)
    graph.scale(1.5, 0.75)
    graph.translate(25, 35)
    expectAligned(graph, node)
    graph.matrix(new DOMMatrix([1.2, 0.2, -0.1, 0.8, 40, 20]))
    await nextFrame()
    expectAligned(graph, node)
    expect(graph.container.querySelector('foreignObject')).toBeNull()
  })

  it('updates the shared transform without writing each normal node style', async () => {
    const graph = createGraph()
    const shape = register()
    for (let index = 0; index < 100; index++) {
      graph.addNode({ shape, x: index * 10, y: 30, width: 80, height: 40 })
    }
    await nextFrame()
    const changed: MutationRecord[] = []
    const observer = new MutationObserver(records => changed.push(...records))
    graph.container.querySelectorAll('.x6-vue-html-node').forEach(root =>
      observer.observe(root, {
        attributes: true,
        attributeFilter: ['style'],
      }),
    )
    graph.translate(40, 50)
    graph.scale(1.3, 0.8)
    await nextFrame()
    observer.disconnect()
    expect(changed).toHaveLength(0)
    graph.getNodes().forEach(node => expectAligned(graph, node))
  })

  it('initializes a newly created layer when a custom node returns to the graph', () => {
    const graph = createGraph()
    graph.scale(1.5, 0.75)
    graph.translate(20, 30)
    const custom = document.createElement('div')
    custom.style.cssText = 'position:absolute;inset:0;'
    graph.container.append(custom)
    const node = graph.addNode({
      shape: register(),
      x: 100,
      y: 80,
      width: 160,
      height: 90,
      getContainer: () => custom,
    })
    expect(graph.container.querySelector('.x6-vue-html-layer')).toBeNull()
    node.removeProp('getContainer')
    expectAligned(graph, node)
  })

  it('preserves Vue providers and input focus and cleans up on graph disposal', async () => {
    const graph = createGraph()
    const host = document.createElement('div')
    document.body.append(host)
    containers.push(host)
    const Host = createVueHtmlTeleport(graph)
    const app = createApp(
      defineComponent({
        setup() {
          provide('label', 'Inherited label')
          return () => h(Host)
        },
      }),
    )
    apps.push(app)
    app.mount(host)
    const unmounted = vi.fn()
    const shape = register(
      defineComponent({
        setup() {
          const label = inject<string>('label')
          onUnmounted(unmounted)
          return () =>
            h('input', {
              'aria-label': label,
              style: 'width:100%;height:100%;box-sizing:border-box;',
            })
        },
      }),
    )
    const node = graph.addNode({
      shape,
      x: 100,
      y: 100,
      width: 200,
      height: 60,
    })
    await nextTick()
    await page
      .getByRole('textbox', { name: 'Inherited label' })
      .fill('Editable')
    expect(document.activeElement).toBe(
      getRoot(graph, node).querySelector('input'),
    )
    expect(node.position()).toStrictEqual({ x: 100, y: 100 })
    node.position(110, 120)
    graph.translate(10, 20)
    graph.dispose()
    graphs.splice(graphs.indexOf(graph), 1)
    await nextTick()
    await nextFrame()
    expect(unmounted).toHaveBeenCalledExactlyOnceWith()
    expect(graph.container.querySelector('.x6-vue-html-layer')).toBeNull()
  })
})
