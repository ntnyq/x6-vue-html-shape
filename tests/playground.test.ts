import { Model } from '@antv/x6'
import type { Node } from '@antv/x6'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  DEMO_SCENES,
  registerDemoShapes,
} from '../docs/components/playground/scenes'

function assertNode(node: Node | null): asserts node is Node {
  expect(node?.isNode()).toBe(true)
  if (!node) {
    throw new Error('Demo edges must connect nodes, not fixed points')
  }
}

// Use the real X6 model to verify topology without requiring SVG layout.
describe('playground connections', () => {
  beforeAll(registerDemoShapes)

  it.each(Object.entries(DEMO_SCENES))(
    '%s follows both endpoint nodes',
    (_name, populate) => {
      const model = new Model()
      populate(model)
      expect(model.getEdges().length).toBeGreaterThan(0)

      for (const edge of model.getEdges()) {
        const source = edge.getSourceNode()
        const target = edge.getTargetNode()
        assertNode(source)
        assertNode(target)

        const sourcePoint = edge.getSourcePoint()
        const targetPoint = edge.getTargetPoint()
        source.translate(80, 60)
        target.translate(-40, 20)
        expect(edge.getSourcePoint().toJSON()).toStrictEqual({
          x: sourcePoint.x + 80,
          y: sourcePoint.y + 60,
        })
        expect(edge.getTargetPoint().toJSON()).toStrictEqual({
          x: targetPoint.x - 40,
          y: targetPoint.y + 20,
        })
      }

      model.clear()
      expect(model.getCells()).toHaveLength(0)
      populate(model)
      for (const edge of model.getEdges()) {
        assertNode(edge.getSourceNode())
        assertNode(edge.getTargetNode())
      }
      model.dispose()
    },
  )
})
