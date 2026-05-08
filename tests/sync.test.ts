import type { Graph } from '@antv/x6'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ensureVueHtmlLayer } from '../src/layer'
import { setupVueHtmlShapeSync } from '../src/sync'

type Handler = (...args: unknown[]) => void

class MockGraph {
  public container = document.createElement('div')
  private transform = { a: 2, b: 0, c: 0, d: 3, e: 40, f: 50 }
  public matrix = () => this.transform
  private plugin: { dispose: () => void } | undefined

  public use(plugin: { dispose: () => void }) {
    this.plugin = plugin
  }

  public disposePlugins() {
    this.plugin?.dispose()
    this.plugin = undefined
  }
  private handlers = new Map<string, Set<Handler>>()
  private nodes: { id: string }[] = []

  public findViewByCell = vi.fn(() => ({
    updateHtmlPosition: vi.fn(),
    updateHtmlVisible: vi.fn(),
  }))

  public on(event: string, handler: Handler) {
    const set = this.handlers.get(event) || new Set<Handler>()
    set.add(handler)
    this.handlers.set(event, set)
  }

  public off(event: string, handler: Handler) {
    this.handlers.get(event)?.delete(handler)
  }

  public emit(event: string, payload?: unknown) {
    this.handlers.get(event)?.forEach(handler => handler(payload))
  }

  public getNodes() {
    return this.nodes
  }

  public setNodes(nodes: { id: string }[]) {
    this.nodes = nodes
  }
}

describe('sync', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('batches distinct nodes and deduplicates repeated updates in one frame', () => {
    vi.useFakeTimers()
    const graph = new MockGraph()
    const first = { id: 'a' }
    const second = { id: 'b' }
    const dispose = setupVueHtmlShapeSync(graph as never)

    graph.emit('node:change:position', { node: first })
    graph.emit('node:change:size', { node: second })
    graph.emit('node:moved', { node: first })
    expect(graph.findViewByCell).not.toHaveBeenCalled()
    vi.advanceTimersToNextFrame()
    expect(graph.findViewByCell.mock.calls).toStrictEqual([[first], [second]])

    graph.findViewByCell.mockClear()
    graph.emit('node:change:position', { node: second })
    vi.advanceTimersToNextFrame()
    expect(graph.findViewByCell.mock.calls).toStrictEqual([[second]])
    dispose()
  })

  it.each([
    ['cell:removed', 'node:change:position'],
    ['node:change:position', 'cell:removed'],
  ])('preserves full refresh across %s then %s', (firstEvent, secondEvent) => {
    vi.useFakeTimers()
    const graph = new MockGraph()
    const first = { id: 'a' }
    const second = { id: 'b' }
    graph.setNodes([first, second])
    const dispose = setupVueHtmlShapeSync(graph as never)

    graph.emit(firstEvent, { node: first })
    graph.emit(secondEvent, { node: first })
    vi.advanceTimersToNextFrame()
    expect(graph.findViewByCell.mock.calls).toStrictEqual([[first], [second]])
    dispose()
  })

  it('cancels pending frames and unregisters listeners on disposal', () => {
    vi.useFakeTimers()
    const graph = new MockGraph()
    const node = { id: 'a' }
    graph.setNodes([node])
    const dispose = setupVueHtmlShapeSync(graph as never)
    graph.emit('node:change:position', { node })
    graph.emit('scale')
    dispose()
    graph.emit('node:change:position', { node })
    graph.emit('scale')
    vi.advanceTimersToNextFrame()
    expect(graph.findViewByCell).not.toHaveBeenCalled()
  })

  it('shares the matrix on scale without traversing nodes', () => {
    const graph = new MockGraph()
    graph.setNodes([{ id: '1' }, { id: '2' }])

    const layer = ensureVueHtmlLayer(graph as unknown as Graph)
    const dispose = setupVueHtmlShapeSync(graph as never, {
      useAnimationFrame: false,
    })
    graph.emit('scale')

    expect(graph.findViewByCell).not.toHaveBeenCalled()
    expect(layer.style.getPropertyValue('--x6-vue-transform')).toBe(
      'matrix(2, 0, 0, 3, 40, 50)',
    )
    dispose()
  })

  it('reuses setup and keeps stale disposers from stopping a new session', () => {
    const graph = new MockGraph()
    const first = setupVueHtmlShapeSync(graph as never, {
      useAnimationFrame: false,
    })
    expect(setupVueHtmlShapeSync(graph as never)).toBe(first)
    first()
    const second = setupVueHtmlShapeSync(graph as never, {
      useAnimationFrame: false,
    })
    first()
    graph.emit('node:change:position', { node: { id: 'a' } })
    expect(graph.findViewByCell).toHaveBeenCalledExactlyOnceWith({ id: 'a' })
    second()
  })

  it('updates single node on node change events', () => {
    const graph = new MockGraph()
    const targetNode = { id: 'a' }

    setupVueHtmlShapeSync(graph as never, { useAnimationFrame: false })
    graph.emit('node:change:position', { node: targetNode })

    expect(graph.findViewByCell).toHaveBeenCalledWith(targetNode)
  })

  it('disposes listeners', () => {
    const graph = new MockGraph()

    const dispose = setupVueHtmlShapeSync(graph as never, {
      useAnimationFrame: false,
    })
    dispose()

    graph.emit('scale')

    expect(graph.findViewByCell).not.toHaveBeenCalled()
  })
})
