import type { Graph } from '@antv/x6'
import { HTML_LAYER_CLASS } from './constants'

const layerMap = new WeakMap<HTMLElement, HTMLElement>()
const transformCallbacks = new WeakMap<Graph, Map<HTMLElement, () => void>>()

function updateLayerMatrix(graph: Graph, layer: HTMLElement) {
  const matrix = graph.matrix()
  const transform = `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.e}, ${matrix.f})`

  if (layer.style.getPropertyValue('--x6-vue-transform') !== transform) {
    layer.style.setProperty('--x6-vue-transform', transform)
  }
}

/**
 * Share the complete X6 matrix through an inherited CSS custom property.
 * Nodes using custom containers or opting out of content scaling receive
 * transform updates through their registered callbacks.
 *
 * @param graph - Graph owning the layer and matrix.
 */
export function updateVueHtmlLayerTransform(graph: Graph) {
  const layer = layerMap.get(graph.container)

  if (layer) {
    updateLayerMatrix(graph, layer)
  }

  transformCallbacks.get(graph)?.forEach(update => update())
}

/**
 * Track nodes whose screen geometry cannot inherit the shared transform.
 *
 * @param graph - Owning graph.
 * @param root - HTML node root used as the subscription key.
 * @param update - Callback. Omit it to remove the subscription.
 */
export function trackVueHtmlTransform(
  graph: Graph,
  root: HTMLElement,
  update?: () => void,
) {
  const callbacks = transformCallbacks.get(graph)

  if (update) {
    if (callbacks) {
      callbacks.set(root, update)
    } else {
      transformCallbacks.set(graph, new Map([[root, update]]))
    }
  } else if (callbacks) {
    callbacks.delete(root)

    if (!callbacks.size) {
      transformCallbacks.delete(graph)
    }
  }
}

/**
 * Create or reuse the HTML overlay layer for a graph container.
 *
 * @param graph - Target X6 graph instance.
 * @returns The existing or newly created layer element.
 *
 * @example
 * ```ts
 * import { ensureVueHtmlLayer } from 'x6-vue-html-shape'
 *
 * const layer = ensureVueHtmlLayer(graph)
 * layer.dataset.ready = 'true'
 * ```
 */
export function ensureVueHtmlLayer(graph: Graph): HTMLElement {
  const { container } = graph
  const existed = layerMap.get(container)

  if (existed?.parentElement === container) {
    return existed
  }

  const { ownerDocument } = container
  const layer = ownerDocument.createElement('div')

  layer.className = HTML_LAYER_CLASS
  container.append(layer)
  const computedStyle = ownerDocument.defaultView?.getComputedStyle(container)

  if (computedStyle?.position === 'static') {
    container.style.position = 'relative'
  }

  layerMap.set(container, layer)
  updateLayerMatrix(graph, layer)

  return layer
}

/**
 * Remove the HTML overlay layer associated with a graph container.
 *
 * @param graph - Target X6 graph instance.
 *
 * @example
 * ```ts
 * import { removeVueHtmlLayer } from 'x6-vue-html-shape'
 *
 * removeVueHtmlLayer(graph)
 * ```
 */
export function removeVueHtmlLayer(graph: Graph) {
  const { container } = graph
  const layer = layerMap.get(container)

  layer?.remove()
  layerMap.delete(container)
}

/**
 * Release a node's transform subscription and remove an empty owned layer.
 *
 * @param graph - Owning graph.
 * @param root - Detached node root.
 */
export function releaseVueHtmlRoot(graph: Graph, root: HTMLElement) {
  trackVueHtmlTransform(graph, root)
  removeEmptyVueHtmlLayer(graph)
}

/**
 * Remove the graph's owned layer if it no longer contains any nodes.
 *
 * @param graph - Owning graph.
 */
export function removeEmptyVueHtmlLayer(graph: Graph) {
  const layer = layerMap.get(graph.container)

  if (layer && layer.childElementCount === 0) {
    removeVueHtmlLayer(graph)
  }
}
