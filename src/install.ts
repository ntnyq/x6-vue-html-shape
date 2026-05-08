import { isUndefined } from '@ntnyq/utils'
import type { App, Plugin } from 'vue'
import { registerVueHtmlShapeNode } from './node'
import type { VueHtmlShapePluginOptions } from './types'
import { injectStyle } from './utils/dom'

/**
 * Install the Vue HTML shape plugin into a Vue app.
 *
 * @param {App} app - Vue application instance.
 * @param {VueHtmlShapePluginOptions} [options] - Plugin configuration options.
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
  if (options.injectStyle !== false) {
    injectStyle()
  }

  registerVueHtmlShapeNode({
    ...(isUndefined(options.shape) ? {} : { shape: options.shape }),
    ...(isUndefined(options.compatibleShapeName)
      ? {}
      : { compatibleShapeName: options.compatibleShapeName }),
    ...(isUndefined(options.overwrite) ? {} : { overwrite: options.overwrite }),
    ...(isUndefined(options.primer) ? {} : { primer: options.primer }),
    ...(isUndefined(options.component) ? {} : { component: options.component }),
  })
}

/**
 * Create a Vue plugin object with preconfigured options.
 *
 * @param {VueHtmlShapePluginOptions} [options] - Plugin configuration options.
 * @returns {Plugin} Vue plugin object that installs shape registration.
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
    install(app: App) {
      install(app, options)
    },
  }
}
