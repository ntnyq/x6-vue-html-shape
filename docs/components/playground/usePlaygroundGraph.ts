import type { Graph } from '@antv/x6'
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import type { ShallowRef } from 'vue'
import type { DemoType } from './demos'

const MIN_ZOOM = 0.2
const MAX_ZOOM = 2

export function usePlaygroundGraph(
  container: Readonly<ShallowRef<HTMLDivElement | null>>,
  demo: DemoType,
) {
  const status = shallowRef<'loading' | 'ready' | 'error'>('loading')
  const zoom = shallowRef(1)
  const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`)

  let graph: Graph | null = null
  let disposeSync: (() => void) | null = null
  let observer: ResizeObserver | null = null
  let isDisposed = false
  let populate: ((graph: Graph) => void) | null = null

  function fit() {
    graph?.zoomToFit({ padding: 48, maxScale: 1 })
  }

  function zoomBy(factor: number) {
    if (graph) {
      const nextZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, graph.zoom() * factor),
      )
      graph.zoomTo(nextZoom)
    }
  }

  function reset() {
    if (graph && populate) {
      graph.clearCells()
      populate(graph)
      fit()
    }
  }

  function dispose() {
    observer?.disconnect()
    observer = null
    disposeSync?.()
    disposeSync = null
    graph?.dispose()
    graph = null
  }

  onMounted(async () => {
    try {
      const [{ Graph }, { setupVueHtmlShapeSync }, scenes] = await Promise.all([
        import('@antv/x6'),
        import('x6-vue-html-shape'),
        import('./scenes'),
      ])

      // A route switch can unmount the canvas while its modules are loading.
      if (isDisposed || !container.value) {
        return
      }

      const viewport = container.value.parentElement
      if (!viewport) {
        return
      }

      scenes.registerDemoShapes()
      graph = new Graph({
        container: container.value,
        width: viewport.clientWidth,
        height: viewport.clientHeight,
        async: false,
        grid: {
          visible: true,
          size: 20,
          args: { color: '#cbd5e1', thickness: 1 },
        },
        panning: true,
        mousewheel: {
          enabled: true,
          modifiers: ['ctrl', 'meta'],
          minScale: MIN_ZOOM,
          maxScale: MAX_ZOOM,
        },
      })
      disposeSync = setupVueHtmlShapeSync(graph)
      graph.on('scale', () => {
        zoom.value = graph?.zoom() ?? 1
      })
      populate = scenes.DEMO_SCENES[demo]
      reset()

      observer = new ResizeObserver(() => {
        if (graph) {
          graph.resize(viewport.clientWidth, viewport.clientHeight)
          fit()
        }
      })
      // X6 writes pixel dimensions to its container; observe the fluid parent.
      observer.observe(viewport)
      status.value = 'ready'
    } catch (error) {
      dispose()
      if (!isDisposed) {
        status.value = 'error'
        // Preserve the underlying initialization error for debugging.
        // oxlint-disable-next-line no-console
        console.error('Failed to initialize the playground', error)
      }
    }
  })

  onBeforeUnmount(() => {
    isDisposed = true
    dispose()
  })

  return {
    status,
    zoom,
    zoomLabel,

    fit,
    zoomBy,
    reset,
  }
}
