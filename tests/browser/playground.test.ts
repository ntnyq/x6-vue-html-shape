import { Graph } from '@antv/x6'
import { afterEach, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { createApp, defineComponent, h, nextTick, shallowRef } from 'vue'
import type { App } from 'vue'
import type { DemoType } from '../../docs/components/playground/demos'
import { createPlaygroundI18n } from '../../docs/components/playground/i18n'
import PlaygroundCanvas from '../../docs/components/playground/PlaygroundCanvas.vue'
import '../../src/style.css'

let app: App | undefined
let container: HTMLElement | undefined
let style: HTMLStyleElement | undefined

afterEach(() => {
  app?.unmount()
  app = undefined
  container?.remove()
  style?.remove()
  vi.restoreAllMocks()
})

function mountCaseFlow() {
  const root = document.createElement('div')

  root.className = 'case-flow-test'
  container = root
  style = document.createElement('style')
  style.textContent = `
    .case-flow-test > div { position: relative; width: 800px; height: 320px; }
  `
  document.body.append(container, style)

  const errors = vi.fn()
  const demo = shallowRef<DemoType>('case-flow')

  app = createApp(
    defineComponent(
      () => () => h(PlaygroundCanvas, { key: demo.value, demo: demo.value }),
    ),
  )
  app.config.errorHandler = errors
  app.use(createPlaygroundI18n())
  app.mount(root)

  const canvas = page.getByRole('region', { name: 'Graph canvas' })

  return { canvas, demo, errors, root }
}

async function loadImage(blob: Blob) {
  const image = new Image()
  const url = URL.createObjectURL(blob)

  try {
    image.src = url
    await image.decode()

    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

function imagePixels(image: HTMLImageElement) {
  const canvas = document.createElement('canvas')

  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(image, 0, 0)

  return ctx.getImageData(0, 0, canvas.width, canvas.height).data
}

it('mounts the Case Flow host before its i18n cards and cleans up on reset and scene changes', async () => {
  const addNode = vi.spyOn(Graph.prototype, 'addNode')
  const dispose = vi.spyOn(Graph.prototype, 'dispose')
  const { canvas, demo, errors, root } = mountCaseFlow()
  const heading = (name: string) => canvas.getByRole('heading', { name })

  await expect.element(heading('Case intake')).toBeVisible()
  await expect.element(heading('Evidence review')).toBeVisible()
  expect(addNode).toHaveBeenCalledTimes(2)
  const graph = addNode.mock.contexts[0] as Graph
  const node = graph.getNodes().find(cell => cell.id === 'case-review')!
  const removeListener = vi.spyOn(node, 'off')
  const card = root.querySelector('[data-x6-node-id="case-review"] h2')

  await page
    .getByRole('combobox', { name: 'Card language' })
    .selectOptions('zh-CN')
  await expect.element(heading('案件受理')).toBeVisible()
  await expect.element(heading('证据审查')).toBeVisible()
  expect(root.querySelector('[data-x6-node-id="case-review"] h2')).toBe(card)
  node.setData({ step: 'review', status: 'resolved' })
  await expect.element(canvas.getByText('已解决')).toBeVisible()

  await page.getByRole('button', { name: 'Reset' }).click()
  await expect.element(canvas.getByText('审查中')).toBeVisible()
  expect(removeListener).toHaveBeenCalledWith(
    'change:data',
    expect.any(Function),
  )
  expect(card?.isConnected).toBe(false)
  expect(dispose).not.toHaveBeenCalled()
  const layer = root.querySelector('.x6-vue-html-layer')!
  const resetNode = graph.getNodes().find(cell => cell.id === 'case-review')!
  const removeResetListener = vi.spyOn(resetNode, 'off')

  demo.value = 'text-node'
  await expect.element(canvas.getByText('Backlog')).toBeVisible()
  expect(dispose.mock.contexts).toContain(graph)
  expect(layer.parentElement).toBeNull()
  expect(removeResetListener).toHaveBeenCalledWith(
    'change:data',
    expect.any(Function),
  )
  await expect.element(heading('证据审查')).not.toBeInTheDocument()

  demo.value = 'case-flow'
  await expect.element(heading('证据审查')).toBeVisible()
  const remountedLayer = root.querySelector('.x6-vue-html-layer')!

  app?.unmount()
  app = undefined
  await nextTick()
  expect(remountedLayer.parentElement).toBeNull()
  expect(dispose).toHaveBeenCalledTimes(3)
  expect(errors).not.toHaveBeenCalled()
})

it('exports localized Case Flow titles and statuses to SVG and PNG', async () => {
  const { canvas } = mountCaseFlow()
  const createObjectURL = vi.spyOn(URL, 'createObjectURL')

  // Capture the blob X6 hands to the download link without saving test files.
  const clickDownload = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {})

  async function downloadBlob(format: 'SVG' | 'PNG') {
    createObjectURL.mockClear()
    await page.getByRole('button', { name: `Export ${format}` }).click()
    await expect.poll(() => createObjectURL.mock.calls.length).toBe(1)
    const [blob] = createObjectURL.mock.calls[0]!

    expect(blob).toBeInstanceOf(Blob)
    expect(clickDownload.mock.contexts.at(-1)).toHaveProperty(
      'download',
      `case-flow.${format.toLowerCase()}`,
    )

    return blob as Blob
  }

  async function verifyDownloads(locale: string, labels: string[]) {
    const svgFile = await downloadBlob('SVG')
    const svg = new DOMParser()
      .parseFromString(await svgFile.text(), 'image/svg+xml')
      .querySelector('svg')!
    const svgLabels = Array.from(
      svg.querySelectorAll(`g[lang="${locale}"] text`),
    )

    expect(svgFile.type).toBe('image/svg+xml')
    expect(svgLabels.map(label => label.textContent)).toEqual(labels)

    const pngFile = await downloadBlob('PNG')
    const png = await loadImage(pngFile)

    expect(pngFile.type).toBe('image/png')
    svg.setAttribute('width', String(png.naturalWidth))
    svg.setAttribute('height', String(png.naturalHeight))
    const rasterizedSvg = await loadImage(
      new Blob([new XMLSerializer().serializeToString(svg)], {
        type: 'image/svg+xml',
      }),
    )
    const pngPixels = imagePixels(png)
    const svgPixels = imagePixels(rasterizedSvg)

    expect(
      pngPixels.every((channel, index) => channel === svgPixels[index]),
    ).toBe(true)

    return pngPixels
  }

  await expect
    .element(canvas.getByRole('heading', { name: 'Case intake' }))
    .toBeVisible()
  const english = await verifyDownloads('en', [
    'Case intake',
    'Open',
    'Evidence review',
    'In review',
  ])

  await page
    .getByRole('combobox', { name: 'Card language' })
    .selectOptions('zh-CN')
  await expect
    .element(canvas.getByRole('heading', { name: '案件受理' }))
    .toBeVisible()
  const chinese = await verifyDownloads('zh-CN', [
    '案件受理',
    '待处理',
    '证据审查',
    '审查中',
  ])

  expect(english.length).toBe(chinese.length)
  expect(english.some((channel, index) => channel !== chinese[index])).toBe(
    true,
  )
})
