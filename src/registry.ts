import type { Component } from 'vue'

/**
 * Registry entry for a single shape.
 */
export interface ShapeRegistryItem {
  /** Vue component associated with a shape name. */
  component?: Component
}

const shapeMaps = new Map<string, ShapeRegistryItem>()

/**
 * Register or update a Vue component for a shape.
 *
 * @param {string} shape - Shape name.
 * @param {Component} component - Vue component to bind.
 *
 * @example
 * ```ts
 * import { registerVueShapeComponent } from 'x6-vue-html-shape'
 * import MyNode from './MyNode.vue'
 *
 * registerVueShapeComponent('my-shape', MyNode)
 * ```
 */
export function registerVueShapeComponent(shape: string, component: Component) {
  shapeMaps.set(shape, {
    ...shapeMaps.get(shape),
    component,
  })
}

/**
 * Get the registered Vue component for a shape.
 *
 * @param {string} shape - Shape name.
 * @returns {Component | undefined} Registered component for the shape.
 *
 * @example
 * ```ts
 * import { getVueShapeComponent } from 'x6-vue-html-shape'
 *
 * const component = getVueShapeComponent('my-shape')
 * ```
 */
export function getVueShapeComponent(shape: string): Component | undefined {
  return shapeMaps.get(shape)?.component
}

/**
 * Remove a registered component by shape name.
 *
 * @param {string} shape - Shape name.
 *
 * @example
 * ```ts
 * import { unregisterVueShapeComponent } from 'x6-vue-html-shape'
 *
 * unregisterVueShapeComponent('my-shape')
 * ```
 */
export function unregisterVueShapeComponent(shape: string) {
  shapeMaps.delete(shape)
}

/**
 * Clear all registered Vue shape components.
 *
 * @example
 * ```ts
 * import { clearVueShapeComponents } from 'x6-vue-html-shape'
 *
 * clearVueShapeComponents()
 * ```
 */
export function clearVueShapeComponents() {
  shapeMaps.clear()
}
