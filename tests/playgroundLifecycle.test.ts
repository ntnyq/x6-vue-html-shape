// Deliberately partial module doubles isolate graph lifecycle from SVG layout.
/* oxlint-disable vitest/prefer-import-in-mock */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, shallowRef } from 'vue'
import type { App } from 'vue'
import { usePlaygroundGraph } from '../docs/components/playground/usePlaygroundGraph'

const mocks = vi.hoisted(() => ({
  resize: vi.fn(),
  fit: vi.fn(),
  disposeGraph: vi.fn(),
  disposeSync: vi.fn(),
  observe: vi.fn(),
  disconnect: vi.fn(),
  createGraph: vi.fn(),
  resizeCallback: () => {},
}))

vi.mock('@antv/x6', () => ({
  Graph: class {
    public constructor(options: unknown) {
      mocks.createGraph(options)
    }
    public resize = mocks.resize
    public zoomToFit = mocks.fit
    public dispose = mocks.disposeGraph
    public on = vi.fn()
    public clearCells = vi.fn()
  },
}))
vi.mock('x6-vue-html-shape', () => ({
  setupVueHtmlShapeSync: () => mocks.disposeSync,
}))
vi.mock('../docs/components/playground/scenes', () => ({
  registerDemoShapes: vi.fn(),
  DEMO_SCENES: { 'text-node': vi.fn() },
}))

let app: App | null = null

function mountPlayground() {
  const host = document.createElement('div')
  document.body.append(host)
  let state: ReturnType<typeof usePlaygroundGraph> | null = null
  app = createApp({
    setup() {
      const container = shallowRef<HTMLDivElement | null>(null)
      state = usePlaygroundGraph(container, 'text-node')
      return () => h('div', { class: 'viewport' }, h('div', { ref: container }))
    },
  })
  app.mount(host)
  return { host, getStatus: () => state?.status.value }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      public constructor(onResize: () => void) {
        mocks.resizeCallback = onResize
      }
      public observe = mocks.observe
      public disconnect = mocks.disconnect
    },
  )
})

afterEach(() => {
  app?.unmount()
  app = null
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('playground lifecycle', () => {
  it('resizes from the fluid viewport', async () => {
    const { host, getStatus } = mountPlayground()
    await vi.waitFor(() => expect(getStatus()).toBe('ready'))
    const viewport = host.querySelector('.viewport')!
    expect(mocks.observe).toHaveBeenCalledWith(viewport)
    Object.defineProperties(viewport, {
      clientWidth: { value: 390 },
      clientHeight: { value: 520 },
    })
    mocks.resizeCallback()
    expect(mocks.resize).toHaveBeenLastCalledWith(390, 520)
    expect(mocks.fit).toHaveBeenCalledWith({ padding: 48, maxScale: 1 })
  })

  it('disconnects observers and disposes graph synchronization on unmount', async () => {
    const { getStatus } = mountPlayground()
    await vi.waitFor(() => expect(getStatus()).toBe('ready'))

    app?.unmount()
    app = null
    expect(mocks.disconnect).toHaveBeenCalledExactlyOnceWith()
    expect(mocks.disposeSync).toHaveBeenCalledExactlyOnceWith()
    expect(mocks.disposeGraph).toHaveBeenCalledExactlyOnceWith()
    mocks.resize.mockClear()
    mocks.resizeCallback()
    expect(mocks.resize).not.toHaveBeenCalled()
  })

  it('does not create a graph after leaving during module loading', async () => {
    mountPlayground()
    app?.unmount()
    app = null
    await vi.dynamicImportSettled()
    expect(mocks.createGraph).not.toHaveBeenCalled()
    expect(mocks.observe).not.toHaveBeenCalled()
  })
})
