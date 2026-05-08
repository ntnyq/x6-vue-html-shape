import type { Graph } from '@antv/x6'
import { Node } from '@antv/x6'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createApp,
  defineComponent,
  h,
  inject,
  nextTick,
  onUnmounted,
  provide,
  resolveComponent,
  shallowRef,
} from 'vue'
import type { App } from 'vue'
import { createVueHtmlTeleport } from '../src/teleport'
import { mountVueComponent } from '../src/utils/vue'

const apps: App[] = []

afterEach(() => {
  apps.splice(0).forEach(app => app.unmount())
  document.body.innerHTML = ''
})

function createHost(graph: Graph, label: string) {
  const Host = createVueHtmlTeleport(graph)
  const root = document.createElement('div')
  document.body.append(root)
  const app = createApp(
    defineComponent({
      setup() {
        provide('label', label)
        return () => h(Host)
      },
    }),
  )
  app.component(
    'GlobalLabel',
    defineComponent(() => () => h('b', 'global')),
  )
  app.mount(root)
  apps.push(app)
}

describe('Vue HTML Teleport', () => {
  it('inherits scoped providers and global components, updates props and disposes children', async () => {
    const graph = {} as Graph
    createHost(graph, 'parent')
    const node = new Node({ id: 'shared' })
    const root = document.createElement('div')
    document.body.append(root)
    const unmounted = vi.fn()
    const props = shallowRef({ suffix: 'old' })
    const component = defineComponent({
      props: ['suffix', 'node', 'graph'],
      setup(componentProps) {
        const label = inject('label')
        const getNode = inject<() => Node>('getNode')
        const getGraph = inject<() => Graph>('getGraph')
        expect(getNode?.()).toBe(node)
        expect(getGraph?.()).toBe(graph)
        expect(componentProps.node).toBe(node)
        const GlobalLabel = resolveComponent('GlobalLabel')
        onUnmounted(unmounted)
        return () =>
          h('div', [h(GlobalLabel), `${label}:${componentProps.suffix}`])
      },
    })
    const handle = mountVueComponent({ graph, node, root, component, props })
    await nextTick()
    expect(root.textContent).toBe('globalparent:old')
    props.value = { suffix: 'new' }
    await nextTick()
    expect(root.textContent).toBe('globalparent:new')
    handle.unmount()
    await nextTick()
    expect(root.textContent).toBe('')
    expect(unmounted).toHaveBeenCalledExactlyOnceWith()
  })

  it('isolates graphs with identical node ids and supports host remount', async () => {
    const component = defineComponent({
      setup() {
        const label = inject('label')
        return () => h('span', String(label))
      },
    })
    const first = {} as Graph
    const second = {} as Graph
    createHost(first, 'first')
    createHost(second, 'second')
    const roots = [document.createElement('div'), document.createElement('div')]
    const handles = [first, second].map((graph, index) =>
      mountVueComponent({
        graph,
        node: new Node({ id: 'same' }),
        root: roots[index]!,
        component,
      }),
    )
    await nextTick()
    expect(roots.map(root => root.textContent)).toStrictEqual([
      'first',
      'second',
    ])
    handles.forEach(handle => handle.unmount())
    await nextTick()
    apps.shift()?.unmount()
    expect(() => createHost(first, 'remounted')).not.toThrow()
  })
})
