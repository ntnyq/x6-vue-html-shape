import type { Graph, Node } from '@antv/x6'
import { VueHtmlShapeView } from './view'

/**
 * Render a static SVG card in the node's local coordinates.
 * Return nothing to keep the original SVG representation.
 */
export type VueHtmlSvgNodeRenderer = (
  node: Node,
  document: Document,
) => SVGElement | null | undefined

/**
 * Snapshot visible Vue HTML cards and create an X6 Export hook for one export.
 *
 * The hook inserts static cards into the cloned node groups, so they inherit
 * X6's viewport and node transforms while preserving native edges and ports.
 *
 * @param graph - Graph to snapshot immediately before calling X6 Export.
 * @param renderNode - Synchronously draw an SVG representation for a node.
 * @returns Hook to pass to the X6 SVG or raster image exporter.
 * @throws {TypeError} If a rendered card is outside the SVG namespace or contains `foreignObject`.
 */
export function createVueHtmlSvgExportHook(
  graph: Graph,
  renderNode: VueHtmlSvgNodeRenderer,
) {
  const { stage } = graph.view
  const stageSelector = `.${graph.view.prefixClassName('graph-svg-stage')}`
  const document = stage.ownerDocument
  const cards = new Map<string, SVGElement>()

  for (const group of stage.children) {
    const id = group.getAttribute('data-cell-id')
    const cell = id == null ? null : graph.getCellById(id)

    if (
      !cell?.isNode() ||
      !cell.isVisible() ||
      (group as SVGElement).style.display === 'none' ||
      !(graph.findViewByCell(cell) instanceof VueHtmlShapeView)
    ) {
      continue
    }

    const card = renderNode(cell, document)

    if (!card) {
      continue
    }

    if (
      card.namespaceURI !== stage.namespaceURI ||
      card.localName === 'foreignObject' ||
      card.getElementsByTagNameNS(stage.namespaceURI, 'foreignObject').length
    ) {
      throw new TypeError('An export card must use pure SVG markup.')
    }

    cards.set(cell.id, document.importNode(card, true))
  }

  return function (this: Graph, svg: SVGSVGElement) {
    if (this !== graph) {
      return
    }

    const exportedStage = svg.querySelector(stageSelector)

    if (!exportedStage) {
      return
    }

    for (const group of exportedStage.children) {
      const id = group.getAttribute('data-cell-id')
      const card = id == null ? undefined : cards.get(id)

      if (!card) {
        continue
      }

      // Paint above the primer and label while retaining the order of ports.
      let lastBody = group.lastElementChild

      while (lastBody?.classList.contains('x6-port')) {
        lastBody = lastBody.previousElementSibling
      }

      group.insertBefore(
        svg.ownerDocument.importNode(card, true),
        lastBody ? lastBody.nextSibling : group.firstChild,
      )
    }
  }
}
