import { Export, Graph } from '@antv/x6'
import type { Node } from '@antv/x6'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import {
  createVueHtmlSvgExportHook,
  registerVueHtmlNode,
  setupVueHtmlShapeSync,
  unregisterVueShapeComponent,
} from '../../src'
import '../../src/style.css'

type BeforeSerialize = ReturnType<typeof createVueHtmlSvgExportHook>

const SHAPE = 'export-test-card'
const SVG_NS = 'http://www.w3.org/2000/svg'
const CARD_COLOR = '#dc2626'
const viewBox = { x: 130, y: 30, width: 160, height: 180 }
let graph: Graph

beforeEach(() => {
  const container = document.createElement('div')

  document.body.append(container)
  graph = new Graph({ container, width: 420, height: 280, async: false })
  graph.use(new Export())
  setupVueHtmlShapeSync(graph)
  registerVueHtmlNode({
    shape: SHAPE,
    width: 80,
    height: 40,
    component: () => h('div', 'Live Vue content'),
  })
})

afterEach(() => {
  graph.dispose()
  graph.container.remove()
  Graph.unregisterNode(SHAPE)
  unregisterVueShapeComponent(SHAPE)
})

function renderCard(node: Node, doc: Document) {
  const card = doc.createElementNS(SVG_NS, 'g')
  const rect = doc.createElementNS(SVG_NS, 'rect')
  const text = doc.createElementNS(SVG_NS, 'text')
  const { width, height } = node.size()

  card.setAttribute('data-export-card', '')
  rect.setAttribute('width', String(width))
  rect.setAttribute('height', String(height))
  rect.setAttribute('fill', CARD_COLOR)
  text.setAttribute('x', '8')
  text.setAttribute('y', '20')
  text.setAttribute('fill', 'white')
  text.textContent = node.getData<{ title: string }>().title
  card.append(rect, text)

  return card
}

function exportSvg(beforeSerialize?: BeforeSerialize) {
  return new Promise<SVGSVGElement>(resolve => {
    graph.toSVG(
      svg => {
        const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')

        resolve(doc.querySelector('svg')!)
      },
      {
        ...(beforeSerialize && { beforeSerialize }),
        viewBox,
      },
    )
  })
}

async function exportPng(beforeSerialize?: BeforeSerialize) {
  const uri = await new Promise<string>(resolve =>
    graph.toPNG(resolve, {
      ...(beforeSerialize && { beforeSerialize }),
      viewBox,
    }),
  )
  const img = new Image()

  img.src = uri
  await img.decode()
  const canvas = document.createElement('canvas')

  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(img, 0, 0)

  return ctx
}

function pixel(ctx: CanvasRenderingContext2D, x: number, y: number) {
  return Array.from(ctx.getImageData(x, y, 1, 1).data)
}

describe('Vue HTML SVG export hook', () => {
  it('adds opt-in SVG markup to the cloned node and preserves native edges and ports', async () => {
    const card = graph.addNode({
      id: 'card:[]',
      shape: SHAPE,
      x: 60,
      y: 40,
      angle: 90,
      data: { title: 'Card <&>' },
      ports: [{ id: 'out' }],
    })
    const hidden = graph.addNode({
      shape: SHAPE,
      x: 200,
      visible: false,
      data: { title: 'Hidden title' },
    })
    const skipped = graph.addNode({ shape: SHAPE, x: 220 })
    const native = graph.addNode({ shape: 'rect', x: 180 })
    const edge = graph.addEdge({
      source: { cell: card.id, port: 'out' },
      target: { cell: native.id },
    })

    graph.matrix(new DOMMatrix([1.5, 0, 0, 1.5, 40, 30]))
    const renderer = vi.fn((node: Node, doc: Document) =>
      node === skipped ? undefined : renderCard(node, doc),
    )
    const original = await exportSvg()
    const exported = await exportSvg(
      createVueHtmlSvgExportHook(graph, renderer),
    )
    const cardGroup = exported.querySelector('[data-cell-id="card:[]"]')!
    const marker = cardGroup.querySelector('[data-export-card]')!
    const port = cardGroup.querySelector('.x6-port')!

    expect(original.querySelector('[data-export-card]')).toBeNull()
    expect(exported.querySelector('foreignObject')).toBeNull()
    expect(exported.getAttribute('viewBox')).toBe('130 30 160 180')
    expect(cardGroup.getAttribute('transform')).toBe(
      graph.findViewByCell(card)!.container.getAttribute('transform'),
    )
    expect(
      exported
        .querySelector('.x6-graph-svg-viewport')
        ?.getAttribute('transform'),
    ).toBe(graph.view.viewport.getAttribute('transform'))
    expect(marker.textContent).toBe('Card <&>')
    expect(
      marker.compareDocumentPosition(port) &
        window.Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      exported.querySelector(`[data-cell-id="${edge.id}"] path`),
    ).toBeTruthy()
    expect(
      exported.querySelector(`[data-cell-id="${native.id}"] rect`),
    ).toBeTruthy()
    expect(renderer.mock.calls.map(([node]) => node)).toEqual([card, skipped])
    expect(renderer).not.toHaveBeenCalledWith(hidden, expect.anything())
    expect(graph.container.querySelector('[data-export-card]')).toBeNull()
    expect(
      graph.container.querySelector('.x6-vue-html-node')?.textContent,
    ).toBe('Live Vue content')
  })

  it('keeps SVG card content in sync with the cloned scene when the node is edited', async () => {
    const node = graph.addNode({
      id: 'snapshot-card',
      shape: SHAPE,
      data: { title: 'Before edit' },
    })
    const renderer = vi.fn(renderCard)
    const pending = exportSvg(createVueHtmlSvgExportHook(graph, renderer))

    expect(renderer).toHaveBeenCalledTimes(1)
    const suppliedCard = renderer.mock.results[0]!.value!

    node.resize(160, 40)
    node.setData({ title: 'After edit' })
    suppliedCard.querySelector('text')!.textContent = 'Changed outside the hook'

    const exported = await pending
    const group = exported.querySelector('[data-cell-id="snapshot-card"]')!

    expect(group.querySelector(':scope > rect')?.getAttribute('width')).toBe(
      '80',
    )
    expect(
      group.querySelector('[data-export-card] rect')?.getAttribute('width'),
    ).toBe('80')
    expect(group.querySelector('[data-export-card]')?.textContent).toBe(
      'Before edit',
    )

    const nextExport = await exportSvg(
      createVueHtmlSvgExportHook(graph, renderCard),
    )

    expect(nextExport.querySelector('[data-export-card]')?.textContent).toBe(
      'After edit',
    )
    expect(
      nextExport
        .querySelector('[data-export-card] rect')
        ?.getAttribute('width'),
    ).toBe('160')
  })

  it('rasterizes the rotated card snapshot and native edge within the transformed crop', async () => {
    const node = graph.addNode({
      shape: SHAPE,
      x: 60,
      y: 40,
      angle: 90,
      data: { title: 'Card' },
    })

    graph.addEdge({
      source: { x: 130, y: 40 },
      target: { x: 170, y: 40 },
      attrs: {
        line: { stroke: '#111111', strokeWidth: 4, targetMarker: null },
      },
    })
    graph.matrix(new DOMMatrix([1.5, 0, 0, 1.5, 40, 30]))
    const native = await exportPng()
    const pending = exportPng(createVueHtmlSvgExportHook(graph, renderCard))

    node.resize(160, 40)
    const raster = await pending

    expect([raster.canvas.width, raster.canvas.height]).toEqual([160, 180])
    expect(pixel(native, 60, 40)).toEqual([255, 255, 255, 255])
    expect(pixel(raster, 60, 40)).toEqual([220, 38, 38, 255])
    expect(pixel(raster, 15, 90)).toEqual([255, 255, 255, 255])
    expect(pixel(raster, 60, 165)).toEqual([255, 255, 255, 255])
    expect(pixel(raster, 120, 60)).toEqual([17, 17, 17, 255])
  })

  it.each(['SVG', 'PNG'])(
    'rejects invalid cards before starting default async %s export',
    format => {
      graph.addNode({ shape: SHAPE })
      const beforeExport = vi.fn()
      const complete = vi.fn()
      const exportImage =
        format === 'SVG' ? graph.toSVG.bind(graph) : graph.toPNG.bind(graph)

      graph.on('before:export', beforeExport)

      expect(() =>
        exportImage(complete, {
          beforeSerialize: createVueHtmlSvgExportHook(graph, (_node, doc) => {
            const group = doc.createElementNS(SVG_NS, 'g')

            group.append(doc.createElementNS(SVG_NS, 'foreignObject'))

            return group
          }),
        }),
      ).toThrow(new TypeError('An export card must use pure SVG markup.'))
      expect(beforeExport).not.toHaveBeenCalled()
      expect(complete).not.toHaveBeenCalled()
    },
  )
})
