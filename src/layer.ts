import type { Graph } from '@antv/x6'
import { HTML_LAYER_CLASS } from './constants'

const layerMap = new WeakMap<HTMLElement, HTMLElement>()
const transformCallbacks = new WeakMap<Graph, Map<HTMLElement, () => void>>()

/**
 * Share the complete X6 matrix through an inherited CSS custom property.
 * Only nodes opting out of content scaling or using a custom container need JS updates.
 * @param {Graph} graph - Graph owning the layer and matrix.
 */
export function updateVueHtmlLayerTransform(graph: Graph) {
  const layer = layerMap.get(graph.container)
  if (layer) {
    const matrix = graph.matrix()
    const transform = `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.e}, ${matrix.f})`
    if (layer.style.getPropertyValue('--x6-vue-transform') !== transform) {
      layer.style.setProperty('--x6-vue-transform', transform)
    }
  }
  transformCallbacks.get(graph)?.forEach(update => update())
}

/**
 * Track nodes whose screen geometry cannot inherit the shared transform.
 * @param {Graph} graph - Owning graph.
 * @param {HTMLElement} root - HTML node root used as the subscription key.
 * @param {Function} [update] - Callback, or undefined to remove the subscription.
 */
export function trackVueHtmlTransform(
  graph: Graph,
  root: HTMLElement,
  update?: () => void,
) {
  let callbacks = transformCallbacks.get(graph)
  if (!callbacks) {
    callbacks = new Map()
    transformCallbacks.set(graph, callbacks)
  }
  if (update) {
    callbacks.set(root, update)
  } else {
    callbacks.delete(root)
  }
}

/**
 * Create or reuse the HTML overlay layer for a graph container.
 *
 * @param {Graph} graph - Target X6 graph instance.
 * @returns {HTMLElement} The existing or newly created layer element.
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

  if (existed && container.contains(existed)) {
    return existed
  }

  let layer = container.querySelector<HTMLElement>(`.${HTML_LAYER_CLASS}`)

  if (!layer) {
    layer = document.createElement('div')
    layer.className = HTML_LAYER_CLASS
    container.append(layer)
  }

  const computedStyle = globalThis.getComputedStyle(container)
  if (computedStyle.position === 'static') {
    container.style.position = 'relative'
  }

  layerMap.set(container, layer)
  updateVueHtmlLayerTransform(graph)

  return layer
}

/**
 * Remove the HTML overlay layer associated with a graph container.
 *
 * @param {Graph} graph - Target X6 graph instance.
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
  // Custom-container nodes may still be alive when an empty owned layer is removed.
  if (!transformCallbacks.get(graph)?.size) {
    transformCallbacks.delete(graph)
  }
}

/**
 * Release a node's transform subscription and remove an empty owned layer.
 * @param {Graph} graph - Owning graph.
 * @param {HTMLElement} root - Detached node root.
 */
export function releaseVueHtmlRoot(graph: Graph, root: HTMLElement) {
  transformCallbacks.get(graph)?.delete(root)
  const layer = layerMap.get(graph.container)
  if (layer && layer.childElementCount === 0) {
    layer.remove()
    layerMap.delete(graph.container)
  }
}
