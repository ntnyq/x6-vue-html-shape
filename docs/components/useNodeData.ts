import { onBeforeUnmount, shallowRef } from 'vue'
import type { ShallowRef } from 'vue'

interface X6NodeLike {
  getData: <T = unknown>() => T
  on: (event: string, handler: () => void) => void
  off: (event: string, handler: () => void) => void
}

export function useNodeData<T = unknown>(node: X6NodeLike): ShallowRef<T> {
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
