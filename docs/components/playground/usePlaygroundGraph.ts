import type { Graph } from '@antv/x6'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import type { Component, ShallowRef } from 'vue'
import type {
  createVueHtmlSvgExportHook,
  VueHtmlSvgNodeRenderer,
} from 'x6-vue-html-shape'
import type { DemoType } from './demos'

const MIN_ZOOM = 0.2
const MAX_ZOOM = 2
const EXPORT_PADDING = 12

export function usePlaygroundGraph(
  container: Readonly<ShallowRef<HTMLDivElement | null>>,
  demo: DemoType,
) {
  const status = shallowRef<'loading' | 'ready' | 'error'>('loading')
  const zoom = shallowRef(1)
  const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`)
  const teleportHost = shallowRef<Component>()

  let graph: Graph | null = null
  let disposeSync: (() => void) | null = null
  let observer: ResizeObserver | null = null
  let isDisposed = false
  let populate: ((graph: Graph) => void) | null = null
  let createExportHook: typeof createVueHtmlSvgExportHook | undefined

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

  function downloadCaseFlow(
    format: 'svg' | 'png',
    renderNode: VueHtmlSvgNodeRenderer,
  ) {
    if (!graph || !createExportHook || status.value !== 'ready') {
      return
    }

    const options = {
      beforeSerialize: createExportHook(graph, renderNode),
      viewBox: graph.getContentBBox().inflate(EXPORT_PADDING),
    }

    if (format === 'svg') {
      graph.exportSVG('case-flow.svg', { ...options, preserveDimensions: true })
    } else {
      graph.exportPNG('case-flow.png', { ...options, ratio: 2 })
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
      const [x6, shapes, scenes] = await Promise.all([
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
      const instance = new x6.Graph({
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

      graph = instance
      disposeSync = shapes.setupVueHtmlShapeSync(instance)
      instance.on('scale', () => {
        zoom.value = instance.zoom()
      })

      if (demo === 'case-flow') {
        teleportHost.value = shapes.createVueHtmlTeleport(instance)
        // The cards use i18n during setup, so the host must mount first.
        await nextTick()

        if (graph !== instance) {
          return
        }

        instance.use(new x6.Export())
        createExportHook = shapes.createVueHtmlSvgExportHook
      }

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
      teleportHost.value = undefined

      if (!isDisposed) {
        status.value = 'error'
        // Preserve the underlying initialization error for debugging.
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
    teleportHost,

    fit,
    zoomBy,
    reset,
    downloadCaseFlow,
  }
}
