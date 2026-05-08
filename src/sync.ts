import type { Graph, Node } from '@antv/x6'
import { removeVueHtmlLayer, updateVueHtmlLayerTransform } from './layer'

const syncDisposers = new WeakMap<Graph, () => void>()
const SYNC_PLUGIN_NAME = 'vue-html-shape-sync'

/**
 * Runtime sync behavior options.
 */
export interface SyncOptions {
  /** Reserved option for throttling updates in future compatibility. */
  throttle?: number
  /** Whether updates should be wrapped in `requestAnimationFrame`. */
  useAnimationFrame?: boolean
}

interface NodeEventPayload {
  node: Node
}

/**
 * Bind graph events and keep Vue HTML nodes synchronized.
 *
 * Returns a dispose function to remove listeners.
 *
 * @param {Graph} graph - Target X6 graph instance.
 * @param {SyncOptions} [options] - Sync behavior options.
 * @returns {() => void} Function that removes all listeners and cancels pending frame.
 *
 * @example
 * ```ts
 * import { Graph } from '@antv/x6'
 * import { setupVueHtmlShapeSync } from 'x6-vue-html-shape'
 *
 * const graph = new Graph({ container: document.getElementById('app')! })
 * const dispose = setupVueHtmlShapeSync(graph, { useAnimationFrame: true })
 *
 * // later
 * dispose()
 * ```
 */
export function setupVueHtmlShapeSync(graph: Graph, options: SyncOptions = {}) {
  const existing = syncDisposers.get(graph)
  if (existing) {
    return existing
  }
  let disposed = false
  let raf: number | null = null
  let shouldUpdateAll = false
  const pendingNodes = new Set<Node>()

  const updateNode = (node: Node) => {
    const view = graph.findViewByCell(node) as {
      updateHtmlPosition?: () => void
      updateHtmlVisible?: () => void
    } | null

    view?.updateHtmlPosition?.()
    view?.updateHtmlVisible?.()
  }

  const flush = () => {
    raf = null
    const nodes = shouldUpdateAll ? graph.getNodes() : [...pendingNodes]
    shouldUpdateAll = false
    pendingNodes.clear()

    for (const node of nodes) {
      updateNode(node)
    }
  }

  const schedule = () => {
    if (disposed) {
      return
    }
    if (options.useAnimationFrame === false) {
      flush()
      return
    }

    if (raf === null) {
      raf = requestAnimationFrame(flush)
    }
  }

  const updateAll = () => {
    shouldUpdateAll = true
    pendingNodes.clear()
    schedule()
  }

  const updateOne = ({ node }: NodeEventPayload) => {
    if (!shouldUpdateAll) {
      pendingNodes.add(node)
    }
    schedule()
  }

  // Update the inherited matrix immediately so SVG and HTML move together.
  const updateTransform = () => {
    if (!disposed) {
      updateVueHtmlLayerTransform(graph)
    }
  }
  graph.on('scale', updateTransform)
  graph.on('translate', updateTransform)
  graph.on('resize', updateTransform)
  graph.on('node:moving', updateOne)
  graph.on('node:moved', updateOne)
  graph.on('node:change:position', updateOne)
  graph.on('node:change:size', updateOne)
  graph.on('node:change:visible', updateOne)
  graph.on('node:change:zIndex', updateAll)
  graph.on('cell:removed', updateAll)

  // Direct matrix changes and graph rotation do not emit scale/translate events.
  const viewport = graph.view?.viewport
  const observer = viewport ? new MutationObserver(updateTransform) : undefined
  if (viewport) {
    observer?.observe(viewport, {
      attributes: true,
      attributeFilter: ['transform'],
    })
  }
  updateTransform()

  const dispose = () => {
    if (disposed) {
      return
    }
    disposed = true
    observer?.disconnect()
    if (raf !== null) {
      cancelAnimationFrame(raf)
      raf = null
    }
    pendingNodes.clear()
    shouldUpdateAll = false
    graph.off('scale', updateTransform)
    graph.off('translate', updateTransform)
    graph.off('resize', updateTransform)
    graph.off('node:moving', updateOne)
    graph.off('node:moved', updateOne)
    graph.off('node:change:position', updateOne)
    graph.off('node:change:size', updateOne)
    graph.off('node:change:visible', updateOne)
    graph.off('node:change:zIndex', updateAll)
    graph.off('cell:removed', updateAll)
    syncDisposers.delete(graph)
  }

  // X6 owns this cleanup and calls it from graph.dispose(), including pending RAFs.
  graph.use({
    name: SYNC_PLUGIN_NAME,
    init() {
      // Subscriptions are initialized above; this plugin owns their disposal.
    },
    dispose() {
      dispose()
      // Graph disposal has already removed the node views at this point.
      const layer = graph.container.querySelector('.x6-vue-html-layer')
      if (layer?.childElementCount === 0) {
        removeVueHtmlLayer(graph)
      }
    },
  })
  const stop = () => {
    if (!disposed) {
      graph.disposePlugins(SYNC_PLUGIN_NAME)
    }
  }
  syncDisposers.set(graph, stop)
  return stop
}
