import type { Graph } from '@antv/x6'
import { afterEach, describe, expect, it } from 'vitest'
import { ensureVueHtmlLayer, removeVueHtmlLayer } from '../src/layer'

interface MockGraph {
  container: HTMLElement
}

function asGraph(mock: MockGraph): Graph {
  return Object.assign(mock, {
    matrix: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  }) as unknown as Graph
}

describe('layer', () => {
  let container: HTMLDivElement | null = null
  let graph: MockGraph | null = null

  afterEach(() => {
    container?.remove()
    container = null
    graph = null
  })

  it('creates and reuses the html layer', () => {
    container = document.createElement('div')
    document.body.append(container)
    graph = { container }

    const first = ensureVueHtmlLayer(asGraph(graph))
    const second = ensureVueHtmlLayer(asGraph(graph))

    expect(first).toBe(second)
    expect(container.querySelectorAll('.x6-vue-html-layer')).toHaveLength(1)
  })

  it('forces container to relative positioning when static', () => {
    container = document.createElement('div')
    container.style.position = 'static'
    document.body.append(container)
    graph = { container }

    ensureVueHtmlLayer(asGraph(graph))

    expect(container.style.position).toBe('relative')
  })

  it('removes layer when requested', () => {
    container = document.createElement('div')
    document.body.append(container)
    graph = { container }

    ensureVueHtmlLayer(asGraph(graph))
    removeVueHtmlLayer(asGraph(graph))

    expect(container.querySelector('.x6-vue-html-layer')).toBeNull()
  })
})
