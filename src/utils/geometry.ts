import type { Graph, Node } from '@antv/x6'
import type { VueHtmlShapeProperties } from '../types'

const DEGREES_PER_HALF_TURN = 180
const RADIANS_PER_DEGREE = Math.PI / DEGREES_PER_HALF_TURN

/**
 * Compose node-centered rotation with the graph's complete affine matrix.
 * @param {Node} node - Node whose local box is projected.
 * @param {Graph} graph - Graph owning the viewport matrix.
 * @param {VueHtmlShapeProperties} props - Content scaling and container options.
 * @returns {object} Wrapper size and transform styles.
 */
export function getHtmlNodeGeometry(
  node: Node,
  graph: Graph,
  props: VueHtmlShapeProperties,
) {
  const bbox = node.getBBox()
  const angle = node.getAngle() * RADIANS_PER_DEGREE
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const x =
    bbox.x + bbox.width / 2 - (cos * bbox.width) / 2 + (sin * bbox.height) / 2
  const y =
    bbox.y + bbox.height / 2 - (sin * bbox.width) / 2 - (cos * bbox.height) / 2

  if (props.scaleContent !== false && !props.getContainer) {
    return {
      width: `${bbox.width}px`,
      height: `${bbox.height}px`,
      transform: `var(--x6-vue-transform, matrix(1, 0, 0, 1, 0, 0)) matrix(${cos}, ${sin}, ${-sin}, ${cos}, ${x}, ${y})`,
    }
  }

  const matrix = graph.matrix()
  const matrixA = matrix.a * cos + matrix.c * sin
  const matrixB = matrix.b * cos + matrix.d * sin
  const matrixC = matrix.c * cos - matrix.a * sin
  const matrixD = matrix.d * cos - matrix.b * sin
  const matrixE = matrix.a * x + matrix.c * y + matrix.e
  const matrixF = matrix.b * x + matrix.d * y + matrix.f
  const sx =
    props.scaleContent === false ? Math.hypot(matrixA, matrixB) || 1 : 1
  const sy =
    props.scaleContent === false ? Math.hypot(matrixC, matrixD) || 1 : 1
  return {
    width: `${bbox.width * sx}px`,
    height: `${bbox.height * sy}px`,
    transform: `matrix(${matrixA / sx}, ${matrixB / sx}, ${matrixC / sy}, ${matrixD / sy}, ${matrixE}, ${matrixF})`,
  }
}
