import { Graph, Node } from '@antv/x6'
import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import {
  clearVueShapeComponents,
  createVueHtmlShapePlugin,
  DEFAULT_VIEW_NAME,
  COMPAT_SHAPE_NAME,
  getVueShapeComponent,
  registerVueHtmlShapeNode,
  registerVueShapeComponent,
  registerVueHtmlNode,
  shouldStopGraphMouseDown,
  unregisterVueShapeComponent,
} from '../src'

describe('registry', () => {
  it('forwards inherited X6 defaults and custom markup through registration', () => {
    const base = 'metadata-base'
    const shape = 'metadata-node'
    const markup = [{ tagName: 'circle', selector: 'face' }]

    try {
      Graph.registerNode(base, {
        markup,
        view: 'node',
        width: 125,
        height: 80,
        attrs: { face: { fill: 'red', stroke: 'green' } },
      })
      registerVueHtmlNode({
        shape,
        component: { name: 'MetadataNode' },
        inherit: base,
        height: 60,
        attrs: { face: { fill: 'blue' } },
        ports: [{ id: 'out' }],
        data: { source: 'registration' },
        propHooks: metadata => ({ ...metadata, customProp: true }),
      })

      const node = Node.create({ shape })

      expect(node.view).toBe(DEFAULT_VIEW_NAME)
      expect(node.getSize()).toStrictEqual({ width: 125, height: 60 })
      expect(Node.create({ shape, width: 200, height: 95 }).getSize()).toEqual({
        width: 200,
        height: 95,
      })
      expect(node.getMarkup()).toStrictEqual(markup)
      expect(node.getAttrs()).toMatchObject({
        face: { fill: 'blue', stroke: 'green' },
      })
      expect(node.getPorts()).toMatchObject([{ id: 'out' }])
      expect(node.getData()).toStrictEqual({ source: 'registration' })
      expect(node.getProp('customProp')).toBe(true)
    } finally {
      Graph.unregisterNode(shape)
      Graph.unregisterNode(base)
      unregisterVueShapeComponent(shape)
    }
  })

  it('forwards defaults and explicit markup through plugin installation', () => {
    const shape = 'plugin-metadata-node'
    const markup = [{ tagName: 'ellipse', selector: 'custom' }]

    try {
      createApp({}).use(
        createVueHtmlShapePlugin({
          shape,
          width: 140,
          markup,
          primer: 'circle',
          injectStyle: false,
        }),
      )

      const node = Node.create({ shape, primer: 'rect' })

      expect(node.getSize().width).toBe(140)
      expect(node.getMarkup()).toStrictEqual(markup)
      expect(node.getProp('injectStyle')).toBeUndefined()
    } finally {
      Graph.unregisterNode(shape)
    }
  })

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

  it('rolls back the primary shape when compatibility registration fails', () => {
    const shape = 'failed-compat-registration'
    const occupied = Graph.registerNode(COMPAT_SHAPE_NAME, { width: 100 })

    try {
      expect(() =>
        registerVueHtmlShapeNode({
          shape,
          compatibleShapeName: true,
          component: { name: 'Compatible' },
        }),
      ).toThrow(/already registered/u)
      expect(Node.registry.get(shape)).toBeUndefined()
      expect(getVueShapeComponent(shape)).toBeUndefined()
      expect(Node.registry.get(COMPAT_SHAPE_NAME)).toBe(occupied)
    } finally {
      Graph.unregisterNode(shape)
      Graph.unregisterNode(COMPAT_SHAPE_NAME)
    }
  })

  it('restores an overwritten shape if the alias conflicts with an edge', () => {
    const shape = 'overwritten-compat-registration'
    const original = { name: 'Original' }

    try {
      registerVueHtmlNode({ shape, component: original, width: 100 })
      const previous = Node.registry.get(shape)

      Graph.registerEdge(COMPAT_SHAPE_NAME, { inherit: 'edge' })
      expect(() =>
        registerVueHtmlNode({
          shape,
          component: { name: 'Replacement' },
          compatibleShapeName: true,
          overwrite: true,
          width: 200,
        }),
      ).toThrow(/Edge/u)
      expect(Node.registry.get(shape)).toBe(previous)
      expect(Node.create({ shape }).getSize().width).toBe(100)
      expect(getVueShapeComponent(shape)).toBe(original)
    } finally {
      Graph.unregisterNode(shape)
      Graph.unregisterEdge(COMPAT_SHAPE_NAME)
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
  it.each(['button', 'a', 'label', 'summary'])(
    'protects nested content inside %s',
    tag => {
      const control = document.createElement(tag)
      const label = document.createElement('span')

      control.append(label)
      expect(shouldStopGraphMouseDown(label)).toBe(true)
    },
  )

  it('recognizes controls in another document', () => {
    const frame = document.createElement('iframe')

    document.body.append(frame)

    try {
      const input = frame.contentDocument!.createElement('input')

      expect(shouldStopGraphMouseDown(input)).toBe(true)
    } finally {
      frame.remove()
    }
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
