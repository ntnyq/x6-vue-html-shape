import { Graph, MiniMap, NodeView } from '@antv/x6'
import type { CellAttrs, Node, NodeMetadata } from '@antv/x6'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import {
  createApp,
  defineComponent,
  h,
  inject,
  nextTick,
  onUnmounted,
  provide,
  shallowRef,
} from 'vue'
import type { App, Component } from 'vue'
import {
  createVueHtmlTeleport,
  registerVueHtmlNode,
  setupVueHtmlShapeSync,
  unregisterVueShapeComponent,
} from '../../src'
import '../../src/style.css'

const SHAPE = 'migration-card'
const HTML_NODE = '.x6-vue-html-node'
const HTML_LAYER = '.x6-vue-html-layer'

let fixture: HTMLElement
let graph: Graph
let app: App | undefined

beforeEach(() => {
  fixture = document.createElement('div')
  const container = document.createElement('div')

  fixture.append(container)
  document.body.append(fixture)
  graph = new Graph({
    container,
    width: 640,
    height: 420,
    async: false,
    connecting: { allowBlank: false, allowNode: false },
  })
  setupVueHtmlShapeSync(graph)
})

afterEach(async () => {
  graph.dispose()
  await nextTick()
  app?.unmount()
  app = undefined
  fixture.remove()
  Graph.unregisterNode(SHAPE)
  unregisterVueShapeComponent(SHAPE)
})

function addPortNode(
  position: Pick<NodeMetadata, 'x' | 'y'>,
  side: string,
  id: 'out' | 'in',
  args: { dx?: number; dy?: number },
) {
  const node = graph.addNode({
    ...position,
    shape: SHAPE,
    ports: {
      groups: {
        [side]: {
          position: side,
          attrs: {
            circle: {
              r: 6,
              fill: '#2563eb',
              stroke: 'none',
              magnet: id === 'out' ? true : 'passive',
            },
          },
        },
      },
      items: [{ id, group: side, args }],
    },
  })
  const magnet = (graph.findViewByCell(node) as NodeView).findPortElem(
    id,
    'circle',
  )!
  const root = graph.container.querySelector<HTMLElement>(
    `${HTML_NODE}[data-cell-id="${node.id}"]`,
  )!

  return { node, magnet, root }
}

function hitCenter(element: Element) {
  const { x, y, width, height } = element.getBoundingClientRect()

  return document.elementFromPoint(x + width / 2, y + height / 2)
}

async function expectPortConnection(
  source: ReturnType<typeof addPortNode>,
  target: ReturnType<typeof addPortNode>,
) {
  expect(hitCenter(source.magnet)).toBe(source.magnet)
  expect(hitCenter(target.magnet)).toBe(target.magnet)
  await userEvent.dragAndDrop(source.magnet, target.magnet)
  const edges = graph.getEdges()

  expect(edges).toHaveLength(1)
  const edge = edges[0]!

  expect(edge.getSource()).toMatchObject({ cell: source.node.id, port: 'out' })
  expect(edge.getTarget()).toMatchObject({ cell: target.node.id, port: 'in' })
}

describe('native ports with Vue cards', () => {
  it.each([
    {
      side: 'right',
      targetSide: 'left',
      offset: 'dx',
      targetPosition: { x: 350, y: 70 },
    },
    {
      side: 'bottom',
      targetSide: 'top',
      offset: 'dy',
      targetPosition: { x: 80, y: 250 },
    },
  ] as const)(
    'connects X6 ports beyond the $side edge of an interactive card',
    async ({ side, targetSide, offset, targetPosition }) => {
      registerVueHtmlNode({
        shape: SHAPE,
        width: 120,
        height: 80,
        component: () =>
          h('div', { style: 'height:100%;background:#ccd' }, 'Card'),
      })
      const source = addPortNode({ x: 80, y: 70 }, side, 'out', {
        [offset]: 10,
      })
      const target = addPortNode(targetPosition, targetSide, 'in', {
        [offset]: -10,
      })

      graph.scale(0.7)
      graph.translate(30, 20)
      expect(source.magnet.getBoundingClientRect()[targetSide]).toBeGreaterThan(
        source.root.getBoundingClientRect()[side],
      )
      expect(target.magnet.getBoundingClientRect()[side]).toBeLessThan(
        target.root.getBoundingClientRect()[targetSide],
      )
      expect(hitCenter(source.root)?.closest(HTML_NODE)).toBe(source.root)
      await expectPortConnection(source, target)
    },
  )

  it('connects inset ports while opted-in controls and a drag handle still work', async () => {
    const clicked = vi.fn()

    registerVueHtmlNode({
      shape: SHAPE,
      width: 180,
      height: 100,
      interactive: false,
      component: () =>
        h(
          'div',
          {
            class: 'card-surface',
            style: 'position:absolute;inset:0 26px;background:#ccd',
          },
          [
            h('div', { style: 'pointer-events:auto;cursor:move' }, 'Drag card'),
            h(
              'button',
              { style: 'pointer-events:auto', onClick: clicked },
              'Run',
            ),
            h('input', {
              'aria-label': 'Card title',
              style: 'pointer-events:auto;width:100%;box-sizing:border-box',
            }),
          ],
        ),
    })
    const source = addPortNode({ x: 80, y: 90 }, 'right', 'out', { dx: -16 })
    const target = addPortNode({ x: 360, y: 90 }, 'left', 'in', { dx: 16 })

    // The port is inside the wrapper, but the opaque surface leaves it exposed.
    const port = source.magnet.getBoundingClientRect()

    expect(port.right).toBeLessThan(source.root.getBoundingClientRect().right)
    expect(port.left).toBeGreaterThan(
      source.root.querySelector('.card-surface')!.getBoundingClientRect().right,
    )
    source.node.setProp('interactive', true)
    expect(hitCenter(source.magnet)?.closest(HTML_NODE)).toBe(source.root)
    source.node.setProp('interactive', false)
    await expectPortConnection(source, target)

    const card = page.elementLocator(source.root)
    const button = card.getByRole('button', { name: 'Run' })
    const input = card.getByRole('textbox', { name: 'Card title' })

    await button.click()
    expect(clicked).toHaveBeenCalledTimes(1)
    await input.click()
    await input.fill('Edited')
    await expect.element(input).toHaveFocus()
    await expect.element(input).toHaveValue('Edited')
    expect(source.node.position()).toEqual({ x: 80, y: 90 })

    const moved = vi.fn()

    graph.on('node:moved', moved)
    await userEvent.dragAndDrop(card.getByText('Drag card'), graph.container, {
      targetPosition: { x: 210, y: 260 },
    })
    expect(source.node.position().y).toBeGreaterThan(90)
    expect(moved).toHaveBeenCalledWith(
      expect.objectContaining({ node: source.node }),
    )
    expect(graph.getEdges()).toHaveLength(1)
  })
})

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

function expectBoundsMatch(element: Element, reference: Element) {
  const actual = element.getBoundingClientRect()
  const expected = reference.getBoundingClientRect()

  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(Math.abs(actual[key] - expected[key])).toBeLessThan(0.5)
  }
}

describe('X6 MiniMap with Vue shapes', () => {
  it('synchronizes and remounts Vue cards with a host for the secondary graph', async () => {
    const mapContainer = document.createElement('div')
    const appContainer = document.createElement('div')
    const mainHost = createVueHtmlTeleport(graph)
    const miniMapHost = shallowRef<Component>()
    const unmounted = vi.fn()

    fixture.append(mapContainer, appContainer)
    app = createApp(
      defineComponent({
        setup() {
          provide('label', 'Shared label')

          return () => [h(mainHost), miniMapHost.value && h(miniMapHost.value)]
        },
      }),
    )
    app.mount(appContainer)
    registerVueHtmlNode({
      shape: SHAPE,
      width: 120,
      height: 80,
      component: defineComponent({
        props: { graph: { type: Graph, required: true } },
        setup(props) {
          const label = inject<string>('label')

          onUnmounted(() => unmounted(props.graph))

          return () => h('div', label)
        },
      }),
    })
    let node: Node | undefined

    async function verifyPreview(scale: number) {
      let preview!: Graph

      graph.use(
        new MiniMap({
          container: mapContainer,
          graphOptions: { async: true },
          createGraph(options) {
            preview = new Graph(options)
            setupVueHtmlShapeSync(preview)
            miniMapHost.value = createVueHtmlTeleport(preview)

            return preview
          },
        }),
      )
      await nextTick()
      node ??= graph.addNode({ shape: SHAPE, x: 80, y: 70 })
      const mainCard = graph.container.querySelector(HTML_NODE)

      await expect
        .poll(() => preview.container.querySelector(HTML_NODE)?.textContent)
        .toBe('Shared label')
      expect(mainCard?.textContent).toBe('Shared label')
      expect(preview.getCellById(node.id)).toBe(node)
      const card = preview.container.querySelector(HTML_NODE)!
      const body = preview
        .findViewByCell(node)!
        .container.querySelector('rect')!

      expectBoundsMatch(card, body)
      preview.scale(scale)
      preview.translate(40, 30)
      expectBoundsMatch(card, body)
      expect(card.getBoundingClientRect().width).toBeCloseTo(120 * scale)
      expect(mainCard?.getBoundingClientRect().width).toBeCloseTo(120)

      graph.disposePlugins('minimap')
      await nextTick()
      expect(unmounted).toHaveBeenLastCalledWith(preview)
      expect(preview.container.querySelector(HTML_LAYER)).toBeNull()
      expect(mapContainer.childElementCount).toBe(0)
      expect(graph.getCellById(node.id)).toBe(node)
      expect(graph.container.querySelector(HTML_NODE)).toBe(mainCard)

      miniMapHost.value = undefined
      await nextTick()
    }

    await verifyPreview(0.5)
    await verifyPreview(0.75)
    expect(unmounted).toHaveBeenCalledTimes(2)
  })

  it('renders and remounts an SVG outline without duplicating Vue cards', async () => {
    const mapContainer = document.createElement('div')
    const setupCard = vi.fn()

    fixture.append(mapContainer)
    registerVueHtmlNode({
      shape: SHAPE,
      width: 120,
      height: 80,
      component: defineComponent(() => {
        setupCard()

        return () => h('div', 'Main card')
      }),
    })
    const node = graph.addNode({ shape: SHAPE, x: 80, y: 70 })
    const other = graph.addNode({
      shape: 'rect',
      x: 280,
      y: 70,
      width: 80,
      height: 60,
    })
    const edge = graph.addEdge({ source: node, target: other })
    const mainCard = graph.container.querySelector(HTML_NODE)

    async function verifyPreview(scale: number) {
      let preview!: Graph

      graph.use(
        new MiniMap({
          container: mapContainer,
          createGraph(options) {
            preview = new Graph(options)

            return preview
          },
          graphOptions: {
            async: true,
            createCellView(cell) {
              return cell.isNode() && cell.shape === SHAPE
                ? MiniMapOutlineView
                : undefined
            },
          },
        }),
      )
      const outline = () =>
        preview.findViewByCell(node)?.container.querySelector('rect')

      await expect.poll(() => outline()?.getAttribute('fill')).toBe('#dbeafe')
      expect(preview.findViewByCell(node)).toBeInstanceOf(MiniMapOutlineView)
      expect(
        preview.findViewByCell(other)?.container.querySelector('rect'),
      ).toBeTruthy()
      expect(
        preview.findViewByCell(edge)?.container.querySelector('path'),
      ).toBeTruthy()
      expect(preview.container.querySelector(HTML_LAYER)).toBeNull()
      preview.scale(scale)
      preview.translate(40, 30)
      // Firefox includes the stroke in the SVG element's client rectangle.
      const initialWidth = outline()!.getBoundingClientRect().width

      expect(Math.abs(initialWidth - node.size().width * scale)).toBeLessThan(1)
      node.resize(150, 90)
      const { width, height } = outline()!.getBoundingClientRect()

      expect(Math.abs(width - 150 * scale)).toBeLessThan(1)
      expect(Math.abs(height - 90 * scale)).toBeLessThan(1)
      node.resize(120, 80)

      graph.disposePlugins('minimap')
      expect(mapContainer.childElementCount).toBe(0)
      expect(graph.container.querySelector(HTML_NODE)).toBe(mainCard)
      expect(graph.getCellById(edge.id)).toBe(edge)
    }

    await verifyPreview(0.5)
    await verifyPreview(0.75)
    expect(setupCard).toHaveBeenCalledTimes(1)
  })
})
