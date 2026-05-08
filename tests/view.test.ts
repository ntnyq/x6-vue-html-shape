import { Node } from '@antv/x6'
import type { Graph } from '@antv/x6'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  defineComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  shallowRef,
} from 'vue'
import type { VueHtmlShapeProperties } from '../src/types'
import { useX6NodeData } from '../src/useNodeData'
import { VueHtmlShapeView } from '../src/view'

const views: VueHtmlShapeView[] = []

function mountView(
  properties: Omit<VueHtmlShapeProperties, 'markup' | 'attrs'> = {},
) {
  const container = document.createElement('div')
  document.body.append(container)
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
  // Exercise X6's real change flags and view lifecycle, without SVG layout.
  const graph = {
    container,
    options: { interacting: true },
    matrix: () => matrix,
    renderer: {
      requestViewUpdate(view: VueHtmlShapeView, flag: number) {
        view.confirmUpdate(flag)
      },
    },
  } as unknown as Graph
  const node = new Node({
    width: 100,
    height: 60,
    component: defineComponent(() => () => h('div', 'Node')),
    ...properties,
  })
  const view = new VueHtmlShapeView(node, { graph })
  views.push(view)
  view.confirmUpdate(view.getFlag(VueHtmlShapeView.action))
  const root = container.querySelector<HTMLElement>('.x6-vue-html-node')!
  return { container, graph, matrix, node, root, view }
}

afterEach(() => {
  for (const view of views.splice(0)) {
    view.remove()
  }
  document.body.innerHTML = ''
})

describe('Vue HTML view', () => {
  it('rotates around the node center and preserves nonuniform graph scaling', () => {
    const {
      matrix: graphMatrix,
      node,
      view,
      root,
    } = mountView({ scaleContent: false })
    Object.assign(graphMatrix, { a: 2, d: 3, e: 10, f: 20 })
    node.setProp('angle', 90, { silent: true })
    view.updateHtmlPosition()
    const matrix = root.style.transform.slice(7, -1).split(',').map(Number)
    const expected = [0, 1, -1, 0, 170, -40]
    matrix.forEach((value, index) =>
      expect(value).toBeCloseTo(expected[index]!),
    )
    expect(root.style.width).toBe('300px')
    expect(root.style.height).toBe('120px')
  })

  it('updates wrapper options and removes obsolete classes and styles', () => {
    const { node, root } = mountView({
      htmlClassName: 'old',
      htmlStyle: { color: 'red', '--accent': 'red' },
    })
    node.setProp('htmlClassName', 'new')
    node.setProp('htmlStyle', { backgroundColor: 'blue' }, { rewrite: true })
    node.setProp('interactive', false)
    expect([...root.classList]).toStrictEqual([
      'x6-vue-html-node',
      'new',
      'is-non-interactive',
    ])
    expect({
      color: root.style.color,
      accent: root.style.getPropertyValue('--accent'),
      background: root.style.backgroundColor,
    }).toStrictEqual({ color: '', accent: '', background: 'blue' })
    node.setProp('interactive', true)
    expect(root.classList.contains('is-non-interactive')).toBe(false)
  })

  it('clears hidden state when visibility synchronization is disabled', () => {
    const { node, root, view } = mountView()
    node.setProp('visible', false, { silent: true })
    view.updateHtmlVisible()
    expect(root.classList.contains('is-hidden')).toBe(true)
    node.setProp('syncVisible', false)
    expect(root.classList.contains('is-hidden')).toBe(false)
  })

  it('removes the old component and the empty layer when component is cleared', () => {
    const { node, container } = mountView()
    node.removeProp('component')
    expect(container.querySelector('.x6-vue-html-node')).toBeNull()
    expect(container.querySelector('.x6-vue-html-layer')).toBeNull()
  })

  it('moves a mounted node to a custom container without remounting', () => {
    const mounted = vi.fn()
    const component = defineComponent(() => {
      onMounted(mounted)
      return () => h('span', 'Node')
    })
    const { node, root } = mountView({ component })
    const container = document.createElement('div')
    node.setProp('getContainer', () => container)
    expect(root.parentElement).toBe(container)
    expect(mounted).toHaveBeenCalledExactlyOnceWith()
  })

  it('identifies HTML descendants as the owning X6 cell', () => {
    const { node, root } = mountView()
    expect(
      root.firstElementChild?.closest<HTMLElement>('[data-cell-id]')?.dataset[
        'cellId'
      ],
    ).toBe(node.id)
  })

  it.each(['mousedown', 'touchstart'])(
    'keeps %s on controls out of graph handlers',
    eventType => {
      const clicked = vi.fn()
      const component = defineComponent(
        () => () => h('button', { onClick: clicked }, [h('span', 'Action')]),
      )
      const { container, root } = mountView({ component })
      const graphHandler = vi.fn((event: Event) => event.preventDefault())
      container.addEventListener(eventType, graphHandler)
      const label = root.querySelector('span')!
      const event = new Event(eventType, { bubbles: true, cancelable: true })
      label.dispatchEvent(event)
      label.click()
      expect(event.defaultPrevented).toBe(false)
      expect(graphHandler).not.toHaveBeenCalled()
      expect(clicked).toHaveBeenCalledExactlyOnceWith(expect.any(MouseEvent))

      root.dispatchEvent(new Event(eventType, { bubbles: true }))
      expect(graphHandler).toHaveBeenCalledExactlyOnceWith(expect.any(Event))
    },
  )

  it.each(['mousedown', 'touchstart'])(
    'removes the %s guard on unmount',
    eventType => {
      const { container, root, view } = mountView()
      view.unmount()
      expect(container.querySelector('.x6-vue-html-node')).toBeNull()
      // A detached root retained by callers must no longer intercept events.
      const wrapper = document.createElement('div')
      const stopped = vi.fn()
      wrapper.addEventListener(eventType, stopped)
      wrapper.append(root)
      const button = document.createElement('button')
      root.append(button)
      button.dispatchEvent(new Event(eventType, { bubbles: true }))
      expect(stopped).toHaveBeenCalledExactlyOnceWith(expect.any(Event))
    },
  )

  it('updates and removes extra props without losing component state', async () => {
    const mounted = vi.fn()
    const component = defineComponent({
      props: { label: { type: String, default: 'default' } },
      setup(props) {
        const count = shallowRef(0)
        onMounted(mounted)
        return () =>
          h(
            'button',
            { onClick: () => count.value++ },
            `${props.label}:${count.value}`,
          )
      },
    })
    const { node, root } = mountView({ component, props: { label: 'old' } })
    root.querySelector('button')!.click()
    node.setPropByPath('props/label', 'new')
    await nextTick()
    expect(root.textContent).toBe('new:1')
    expect(mounted).toHaveBeenCalledExactlyOnceWith()

    node.removeProp('props')
    await nextTick()
    expect(root.textContent).toBe('default:1')
    expect(mounted).toHaveBeenCalledExactlyOnceWith()
  })

  it('still remounts when keepAliveOnUpdate is false', async () => {
    const mounted = vi.fn()
    const unmounted = vi.fn()
    const component = defineComponent({
      props: ['label'],
      setup(props) {
        onMounted(mounted)
        onUnmounted(unmounted)
        return () => h('span', props.label)
      },
    })
    const { node, root } = mountView({
      component,
      props: { label: 'old' },
      keepAliveOnUpdate: false,
    })
    node.setPropByPath('props/label', 'new')
    await nextTick()
    expect(root.textContent).toBe('new')
    expect(mounted).toHaveBeenCalledTimes(2)
    expect(unmounted).toHaveBeenCalledExactlyOnceWith()
  })

  it('unmounts the component and removes node data listeners', () => {
    const unmounted = vi.fn()
    const component = defineComponent({
      props: ['node'],
      setup(props) {
        useX6NodeData(props.node)
        onUnmounted(unmounted)
        return () => h('div', 'Node')
      },
    })
    const { node, view, container } = mountView({ component })
    const off = vi.spyOn(node, 'off')
    view.remove()
    expect(unmounted).toHaveBeenCalledExactlyOnceWith()
    expect(off).toHaveBeenCalledWith('change:data', expect.any(Function))
    expect(container.querySelector('.x6-vue-html-node')).toBeNull()
  })
})
