import type { Node } from '@antv/x6'
import type { ShallowRef } from 'vue'
import { onBeforeUnmount, shallowRef } from 'vue'

/**
 * Create a reactive ref bound to X6 node data changes.
 *
 * @template T
 * @param {Node} node - X6 node instance whose `data` changes should be tracked.
 * @returns {ShallowRef<T>} A shallow ref that stays in sync with `node.getData()`.
 * @example
 * ```ts
 * import { useX6NodeData } from 'x6-vue-html-shape'
 *
 * const data = useX6NodeData<{ label: string }>(node)
 * console.log(data.value.label)
 * ```
 */
export function useX6NodeData<T = unknown>(node: Node): ShallowRef<T> {
  const data = shallowRef<T>(node.getData<T>())

  const update = () => {
    data.value = node.getData<T>()
  }

  node.on('change:data', update)

  onBeforeUnmount(() => {
    node.off('change:data', update)
  })

  return data
}
