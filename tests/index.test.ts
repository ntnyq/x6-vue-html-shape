import { Graph } from '@antv/x6'
import { describe, expect, it } from 'vitest'
import {
  clearVueShapeComponents,
  getVueShapeComponent,
  registerVueShapeComponent,
  registerVueHtmlNode,
  shouldStopGraphMouseDown,
  unregisterVueShapeComponent,
} from '../src'

describe('registry', () => {
  it('preserves the component when duplicate node registration fails', () => {
    const shape = 'duplicate-registration-test'
    const original = { name: 'Original' }
    const replacement = { name: 'Replacement' }

    try {
      registerVueHtmlNode({ shape, component: original })
      expect(() =>
        registerVueHtmlNode({ shape, component: replacement }),
      ).toThrow(/already registered/u)
      expect(getVueShapeComponent(shape)).toBe(original)

      registerVueHtmlNode({ shape, component: replacement, overwrite: true })
      expect(getVueShapeComponent(shape)).toBe(replacement)
    } finally {
      Graph.unregisterNode(shape)
      unregisterVueShapeComponent(shape)
    }
  })

  it('registers and retrieves components', () => {
    const component = { name: 'UserNode' }

    clearVueShapeComponents()
    registerVueShapeComponent('user-node', component)

    expect(getVueShapeComponent('user-node')).toBe(component)
  })

  it('unregisters and clears components', () => {
    const component = { name: 'UserNode' }

    clearVueShapeComponents()
    registerVueShapeComponent('user-node', component)
    unregisterVueShapeComponent('user-node')
    expect(getVueShapeComponent('user-node')).toBeUndefined()

    registerVueShapeComponent('user-node', component)
    clearVueShapeComponents()
    expect(getVueShapeComponent('user-node')).toBeUndefined()
  })
})

describe('events', () => {
  it.each(['button', 'a'])('protects nested content inside %s', tag => {
    const control = document.createElement(tag)
    const label = document.createElement('span')
    control.append(label)
    expect(shouldStopGraphMouseDown(label)).toBe(true)
  })

  it('protects SVG descendants of a stop marker', () => {
    const wrapper = document.createElement('div')
    wrapper.dataset['x6VueStop'] = ''
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    icon.append(path)
    wrapper.append(icon)
    expect(shouldStopGraphMouseDown(path)).toBe(true)
  })

  it.each(['', 'true', 'plaintext-only'])(
    'protects inherited contenteditable=%s',
    value => {
      const editor = document.createElement('div')
      editor.setAttribute('contenteditable', value)
      const child = document.createElement('span')
      editor.append(child)
      expect(shouldStopGraphMouseDown(child)).toBe(true)
      child.setAttribute('contenteditable', 'false')
      expect(shouldStopGraphMouseDown(child)).toBe(false)
    },
  )

  it('stops graph mousedown for interactive targets', () => {
    const input = document.createElement('input')
    const button = document.createElement('button')
    const div = document.createElement('div')

    expect(shouldStopGraphMouseDown(input)).toBe(true)
    expect(shouldStopGraphMouseDown(button)).toBe(true)
    expect(shouldStopGraphMouseDown(div)).toBe(false)
  })

  it('stops mousedown when stop marker exists in ancestor', () => {
    const wrapper = document.createElement('div')
    wrapper.dataset['x6VueStop'] = ''
    const child = document.createElement('span')
    wrapper.append(child)

    expect(shouldStopGraphMouseDown(child)).toBe(true)
  })
})
