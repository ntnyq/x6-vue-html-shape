import type { Graph } from '@antv/x6'
import {
  defineComponent,
  h,
  onBeforeUnmount,
  provide,
  shallowReactive,
  Teleport,
  unref,
} from 'vue'
import type { App, Component, PropType } from 'vue'
import type { MountVueOptions } from './utils/vue'

interface TeleportHost {
  entries: Map<symbol, MountVueOptions>
}

const hosts = new WeakMap<Graph, TeleportHost>()

const NodeContent = defineComponent({
  props: {
    entry: {
      type: Object as PropType<MountVueOptions>,
      required: true,
    },
  },
  setup(props) {
    provide('getNode', () => props.entry.node)
    provide('getGraph', () => props.entry.graph)
    return () =>
      h(props.entry.component, {
        ...unref(props.entry.props),
        node: props.entry.node,
        graph: props.entry.graph,
      })
  },
})

/**
 * Create a host for one graph. Mount it inside the application's provider tree
 * before adding nodes, and keep it mounted for the graph's lifetime.
 * @param {Graph} graph - Graph whose nodes this host renders.
 * @returns {Component} Component to mount inside the application's provider tree.
 */
export function createVueHtmlTeleport(graph: Graph): Component {
  return defineComponent({
    name: 'X6VueHtmlTeleport',
    setup() {
      if (hosts.has(graph)) {
        throw new Error(
          'A Vue HTML Teleport host is already mounted for this graph.',
        )
      }
      const host: TeleportHost = {
        entries: shallowReactive(new Map()),
      }

      hosts.set(graph, host)

      onBeforeUnmount(() => {
        hosts.delete(graph)
        host.entries.clear()
      })

      return () =>
        [...host.entries].map(([key, entry]) =>
          h(
            Teleport,
            {
              key,
              to: entry.root,
            },
            [
              h(NodeContent, {
                entry,
              }),
            ],
          ),
        )
    },
  })
}

/**
 * Connect a node to its graph's host when one is mounted.
 * @param {MountVueOptions} options - Component, container and node context.
 * @returns {object | undefined} Unmount handle when a host exists.
 */
export function mountTeleportComponent(
  options: MountVueOptions,
): Pick<App, 'unmount'> | undefined {
  const host = hosts.get(options.graph)

  if (!host) {
    return
  }

  const key = Symbol(options.node.id)

  host.entries.set(key, options)

  return {
    unmount() {
      host.entries.delete(key)
    },
  }
}
