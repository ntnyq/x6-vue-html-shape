import { Graph, Node, ObjectExt } from '@antv/x6'
import { isString } from '@ntnyq/utils'
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

function getDefaultMarkup(primer?: Primer) {
  return [
    {
      tagName: primer || 'rect',
      selector: 'body',
    },
    {
      tagName: 'text',
      selector: 'label',
      // X6's built-in shapes write their label text through this selector.
      groupSelector: 'text',
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
 * @param options - Shape registration options.
 * @throws {Error} If a shape name conflicts and overwrite is disabled.
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
  const {
    shape: name,
    component,
    compatibleShapeName,
    overwrite = false,
    primer,
    markup,
    attrs,
    propHooks,
    ...defaults
  } = options
  const shape = name || DEFAULT_SHAPE_NAME
  const generatedMarkup =
    markup == null && (!defaults.inherit || primer != null)
      ? getDefaultMarkup(primer)
      : undefined
  const nodeMarkup = markup ?? generatedMarkup
  const hooks =
    typeof propHooks === 'function'
      ? [propHooks]
      : Object.values(propHooks ?? {})
  const config = {
    ...defaults,
    ...(nodeMarkup == null ? {} : { markup: nodeMarkup }),
    attrs: ObjectExt.merge(
      {},
      generatedMarkup && {
        body: {
          ...getPrimerAttrs(primer),
          fill: 'none',
          stroke: 'none',
        },
        label: {
          refX: '50%',
          refY: '50%',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fontSize: 14,
          fill: '#333',
          pointerEvents: 'none',
        },
      },
      attrs,
    ),
    propHooks: [
      ...hooks,
      function (metadata) {
        const { primer: nodePrimer } = metadata as VueHtmlShapeProperties
        const label = metadata['label']

        if (
          nodePrimer &&
          metadata.markup == null &&
          generatedMarkup &&
          (this.constructor as typeof Node).getMarkup() === generatedMarkup
        ) {
          metadata.markup = getDefaultMarkup(nodePrimer)
          metadata.attrs = ObjectExt.merge(
            {},
            { body: getPrimerAttrs(nodePrimer) },
            metadata.attrs,
          )
        }

        if (isString(label)) {
          metadata.attrs = ObjectExt.merge(
            {},
            { label: { text: label } },
            metadata.attrs,
          )
        }

        return metadata
      },
    ],
    view: DEFAULT_VIEW_NAME,
  } satisfies Parameters<typeof Node.define>[0]

  const alias = compatibleShapeName && shape !== COMPAT_SHAPE_NAME
  const previous = alias ? Node.registry.get(shape) : undefined

  Graph.registerNode(shape, config, overwrite)

  if (alias) {
    try {
      Graph.registerNode(COMPAT_SHAPE_NAME, config, overwrite)
    } catch (error) {
      if (previous) {
        Graph.registerNode(shape, previous, true)
      } else {
        Graph.unregisterNode(shape)
      }

      throw error
    }
  }

  if (component) {
    registerVueShapeComponent(shape, component)

    if (alias) {
      registerVueShapeComponent(COMPAT_SHAPE_NAME, component)
    }
  }
}

/**
 * Register a single custom shape + component pair.
 *
 * @param options - Node registration options.
 * @throws {Error} If the shape name conflicts and overwrite is disabled.
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
  registerVueHtmlShapeNode(options)
}
