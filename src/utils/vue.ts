import type { Graph, Node } from '@antv/x6'
import { createApp, h, unref } from 'vue'
import type { App, Component, MaybeRef } from 'vue'
import { mountTeleportComponent } from '../teleport'

/**
 * Options for mounting a Vue component into an HTML node container.
 */
export interface MountVueOptions {
  /** Vue component to render. */
  component: Component
  /** Target mount element. */
  root: HTMLElement
  /** Active X6 node. */
  node: Node
  /** Active X6 graph. */
  graph: Graph
  /** Optional extra props forwarded to the component. */
  props?: MaybeRef<Record<string, unknown>>
}

/**
 * Mount a Vue component with `node` and `graph` context providers.
 *
 * @param {MountVueOptions} options - Mount options and runtime context.
 * @returns {object} Unmount handle for the standalone app or Teleport entry.
 *
 * Internal helper. Public node registration and views own this lifecycle;
 * this helper is not available through a package subpath export.
 */
export function mountVueComponent(
  options: MountVueOptions,
): Pick<App, 'unmount'> {
  const teleported = mountTeleportComponent(options)
  if (teleported) {
    return teleported
  }
  const { component, root, node, graph, props } = options

  const app = createApp({
    name: 'X6VueHtmlShapeRoot',
    provide() {
      return {
        getNode: () => node,
        getGraph: () => graph,
      }
    },
    render() {
      return h(component as never, {
        ...unref(props),
        node,
        graph,
      })
    },
  })

  app.mount(root)

  return app
}
