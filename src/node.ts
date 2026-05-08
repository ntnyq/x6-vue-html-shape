import { Graph, ObjectExt } from '@antv/x6'
import { isUndefined } from '@ntnyq/utils'
import {
  COMPAT_SHAPE_NAME,
  DEFAULT_SHAPE_NAME,
  DEFAULT_VIEW_NAME,
} from './constants'
import { registerVueShapeComponent } from './registry'
import type {
  Primer,
  RegisterVueHtmlNodeOptions,
  RegisterVueHtmlShapeOptions,
  VueHtmlShapeProperties,
} from './types'

function getPrimerMarkup(primer?: Primer) {
  return [
    {
      tagName: primer || 'rect',
      selector: 'body',
    },
  ]
}

function getPrimerAttrs(primer?: Primer) {
  switch (primer) {
    case 'circle': {
      return {
        refCx: '50%',
        refCy: '50%',
        refR: '50%',
      }
    }
    case 'ellipse': {
      return {
        refCx: '50%',
        refCy: '50%',
        refRx: '50%',
        refRy: '50%',
      }
    }
    default: {
      return {
        refWidth: '100%',
        refHeight: '100%',
      }
    }
  }
}

/**
 * Register the base Vue HTML shape and optional compatibility alias.
 *
 * @param {RegisterVueHtmlShapeOptions} [options] - Shape registration options.
 *
 * @example
 * ```ts
 * import { registerVueHtmlShapeNode } from 'x6-vue-html-shape'
 * import UserCard from './UserCard.vue'
 *
 * registerVueHtmlShapeNode({
 *   shape: 'user-card',
 *   component: UserCard,
 *   primer: 'rect',
 *   compatibleShapeName: true,
 * })
 * ```
 */
export function registerVueHtmlShapeNode(
  options: RegisterVueHtmlShapeOptions = {},
) {
  const shape = options.shape || DEFAULT_SHAPE_NAME
  const overwrite = options.overwrite ?? false

  const register = (shapeName: string) => {
    Graph.registerNode(
      shapeName,
      {
        attrs: {
          body: {
            ...getPrimerAttrs(options.primer),
            fill: 'none',
            stroke: 'none',
          },
        },
        markup: getPrimerMarkup(options.primer),
        propHooks(metadata) {
          if (metadata.markup === undefined || metadata.markup === null) {
            const primer =
              (metadata as VueHtmlShapeProperties).primer || options.primer
            metadata.markup = getPrimerMarkup(primer)
            metadata.attrs = ObjectExt.merge(
              {},
              {
                body: {
                  ...getPrimerAttrs(primer),
                  fill: 'none',
                  stroke: 'none',
                },
              },
              metadata.attrs || {},
            )
          }

          return metadata
        },
        view: DEFAULT_VIEW_NAME,
      },
      overwrite,
    )
  }

  register(shape)

  if (options.compatibleShapeName && shape !== COMPAT_SHAPE_NAME) {
    register(COMPAT_SHAPE_NAME)
  }

  if (options.component) {
    registerVueShapeComponent(shape, options.component)

    if (options.compatibleShapeName && shape !== COMPAT_SHAPE_NAME) {
      registerVueShapeComponent(COMPAT_SHAPE_NAME, options.component)
    }
  }
}

/**
 * Register a single custom shape + component pair.
 *
 * @param {RegisterVueHtmlNodeOptions} options - Node registration options.
 *
 * @example
 * ```ts
 * import { registerVueHtmlNode } from 'x6-vue-html-shape'
 * import TaskNode from './TaskNode.vue'
 *
 * registerVueHtmlNode({
 *   shape: 'task-node',
 *   component: TaskNode,
 *   overwrite: true,
 * })
 * ```
 */
export function registerVueHtmlNode(options: RegisterVueHtmlNodeOptions) {
  registerVueHtmlShapeNode({
    shape: options.shape,
    component: options.component,
    ...(isUndefined(options.overwrite) ? {} : { overwrite: options.overwrite }),
    ...(isUndefined(options.primer) ? {} : { primer: options.primer }),
  })
}
