import type { App, Plugin } from 'vue'
import { registerVueHtmlShapeNode } from './node'
import type { VueHtmlShapePluginOptions } from './types'
import { injectStyle } from './utils/dom'

/**
 * Install the Vue HTML shape plugin into a Vue app.
 *
 * @param app - Vue application instance.
 * @param options - Plugin configuration options.
 * @throws {Error} If a shape name conflicts and overwrite is disabled.
 *
 * @example
 * ```ts
 * import { createApp } from 'vue'
 * import { install } from 'x6-vue-html-shape'
 *
 * const app = createApp({})
 * install(app, { compatibleShapeName: true })
 * ```
 */
export function install(app: App, options: VueHtmlShapePluginOptions = {}) {
  const { injectStyle: shouldInjectStyle = true, ...registration } = options

  if (shouldInjectStyle) {
    injectStyle()
  }

  registerVueHtmlShapeNode(registration)
}

/**
 * Create a Vue plugin object with preconfigured options.
 *
 * @param options - Plugin configuration options.
 * @returns Vue plugin object that installs shape registration.
 *
 * @example
 * ```ts
 * import { createApp } from 'vue'
 * import { createVueHtmlShapePlugin } from 'x6-vue-html-shape'
 *
 * const app = createApp({})
 * app.use(createVueHtmlShapePlugin({ injectStyle: true }))
 * ```
 */
export function createVueHtmlShapePlugin(
  options: VueHtmlShapePluginOptions = {},
): Plugin {
  return {
    /**
     * Install the shape plugin with the captured options.
     *
     * @param app - Vue application instance.
     * @throws {Error} If a shape name conflicts and overwrite is disabled.
     */
    install(app: App) {
      install(app, options)
    },
  }
}
