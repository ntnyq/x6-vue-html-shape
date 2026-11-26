import { Graph, Selection } from '@antv/x6'
import type { Node } from '@antv/x6'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import {
  createApp,
  defineComponent,
  h,
  inject,
  nextTick,
  onMounted,
  onUnmounted,
  provide,
} from 'vue'
import type { App, Component } from 'vue'
import {
  createVueHtmlTeleport,
  registerVueHtmlNode,
  setupVueHtmlShapeSync,
  unregisterVueShapeComponent,
} from '../../src'
import type { RegisterVueHtmlShapeOptions } from '../../src'
import '../../src/style.css'

const graphs: Graph[] = []
const apps: App[] = []
const containers: HTMLElement[] = []
const shapes: string[] = []

async function nextFrame() {
  // Browser layout and MutationObserver callbacks must complete before assertions.
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
  component: Component = defineComponent(
    () => () =>
      h('div', { style: 'width:100%;height:100%;background:#ccd' }, 'Node'),
  ),
  defaults: RegisterVueHtmlShapeOptions = {},
) {
  const shape = `browser-node-${shapes.length}`

  shapes.push(shape)
  registerVueHtmlNode({ ...defaults, shape, component })

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

describe('SVG and HTML node presentation', () => {
  it('centers the SVG label and preserves the Vue overlay', () => {
    const graph = createGraph()
    const shape = register(
      defineComponent(() => () => h('span', 'Vue')),
      {
        width: 160,
        height: 90,
        label: 'Registered label',
      },
    )
    const node = graph.addNode({ shape, x: 100, y: 80, primer: 'ellipse' })
    const view = graph.findViewByCell(node)!
    const label = view.container.querySelector('text')!
    const body = view.container.querySelector('ellipse')!

    expect(label.namespaceURI).toBe('http://www.w3.org/2000/svg')
    expect(label.textContent).toMatch(/^Registered\slabel$/u)
    expect(getRoot(graph, node).textContent).toBe('Vue')
    const { x, y, width, height } = body.getBoundingClientRect()
    const text = label.getBoundingClientRect()

    expect(Math.abs(text.x + text.width / 2 - (x + width / 2))).toBeLessThan(1)
    expect(Math.abs(text.y + text.height / 2 - (y + height / 2))).toBeLessThan(
      4,
    )
    node.setAttrByPath('label/text', 'Changed')
    expect(label.textContent).toBe('Changed')
    const override = graph.addNode({ shape, label: 'Instance label' })

    expect(override.getAttrByPath('label/text')).toBe('Instance label')
    expect(view.container.querySelector('foreignObject')).toBeNull()
  })

  it('raises selected HTML nodes above overlaps and restores model order', async () => {
    const graph = createGraph()

    graph.use(new Selection())
    const shape = register()
    const geometry = { shape, x: 100, y: 80, width: 160, height: 90 }
    const back = graph.addNode({ ...geometry, zIndex: 2 })
    const front = graph.addNode({ ...geometry, zIndex: 2_147_483_647 })
    const backRoot = getRoot(graph, back)
    const frontRoot = getRoot(graph, front)
    const { x, y } = backRoot.getBoundingClientRect()
    const hit = () =>
      document.elementFromPoint(x + 20, y + 20)?.closest('.x6-vue-html-node')

    expect(hit()).toBe(frontRoot)
    graph.select(back)
    await nextFrame()
    expect(hit()).toBe(backRoot)
    expect(back.getZIndex()).toBe(2)
    back.setZIndex(4)
    expect(hit()).toBe(backRoot)
    graph.unselect(back)
    await nextFrame()
    expect(hit()).toBe(frontRoot)
    expect(backRoot.style.zIndex).toBe('4')

    setupVueHtmlShapeSync(graph)()
    graph.select(back)
    expect(hit()).toBe(frontRoot)
    setupVueHtmlShapeSync(graph)
    expect(hit()).toBe(backRoot)
  })

  it('mirrors the SVG view cursor and honors an explicit HTML override', () => {
    const graph = createGraph()
    const node = graph.addNode({
      shape: register(),
      width: 100,
      height: 60,
      attrs: { root: { style: { cursor: 'crosshair' } } },
    })
    const root = getRoot(graph, node)
    const svg = graph.findViewByCell(node)!.container
    const cursor = () => getComputedStyle(root).cursor

    expect(getComputedStyle(svg).cursor).toBe('crosshair')
    expect(cursor()).toBe('crosshair')
    node.setAttrByPath('root/style/cursor', 'help')
    expect(cursor()).toBe('help')
    node.setProp('htmlStyle', { cursor: 'pointer' })
    node.setAttrByPath('root/style/cursor', 'wait')
    expect(cursor()).toBe('pointer')
    node.removeProp('htmlStyle')
    expect(cursor()).toBe('wait')
  })

  it('refreshes the cursor when X6 updates its movability class on hover', async () => {
    const graph = createGraph()
    const node = graph.addNode({
      shape: register(),
      x: 100,
      y: 80,
      width: 160,
      height: 90,
    })
    const root = getRoot(graph, node)

    expect(getComputedStyle(root).cursor).toBe('move')
    graph.options.interacting = { nodeMovable: false }

    // Start over blank canvas so X6 receives a fresh node entry event.
    await page
      .elementLocator(graph.container)
      .hover({ position: { x: 20, y: 20 } })
    await page.elementLocator(root).hover()
    await expect.poll(() => getComputedStyle(root).cursor).toBe('default')
  })
})

describe('real X6 graph integration', () => {
  it('mounts once when the component initializes node data synchronously', () => {
    const graph = createGraph()
    const mounted = vi.fn()
    const unmounted = vi.fn()
    const shape = register(
      defineComponent(
        (props: { node: Node }) => {
          onMounted(() => {
            mounted()
            props.node.setData({ initialized: true })
          })
          onUnmounted(unmounted)

          return () => h('div', 'Node')
        },
        { props: ['node'] },
      ),
    )

    const node = graph.addNode({ shape })

    expect(node.getData()).toEqual({ initialized: true })
    expect(mounted).toHaveBeenCalledTimes(1)
    node.remove()
    expect(unmounted).toHaveBeenCalledTimes(1)
  })

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
