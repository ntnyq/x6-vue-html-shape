import type { VueHtmlSvgNodeRenderer } from 'x6-vue-html-shape'

export const CASE_FLOW_SHAPE = 'demo-case-flow'

export interface CaseFlowNodeData {
  step: 'intake' | 'review'
  status: 'opened' | 'reviewing' | 'resolved'
}

export function createCaseFlowSvgRenderer(
  locale: string,
  translate: (key: string) => string,
): VueHtmlSvgNodeRenderer {
  return (node, doc) => {
    if (node.shape !== CASE_FLOW_SHAPE) {
      return
    }

    const ns = 'http://www.w3.org/2000/svg'
    const card = doc.createElementNS(ns, 'g')
    const box = doc.createElementNS(ns, 'rect')
    const title = doc.createElementNS(ns, 'text')
    const status = doc.createElementNS(ns, 'text')
    const { width, height } = node.size()
    const data = node.getData<CaseFlowNodeData>()

    card.setAttribute('lang', locale)
    card.setAttribute('font-family', 'sans-serif')
    box.setAttribute('width', String(width))
    box.setAttribute('height', String(height))
    box.setAttribute('rx', '8')
    box.setAttribute('fill', '#ffffff')
    box.setAttribute('stroke', '#cbd5e1')
    title.setAttribute('x', '16')
    title.setAttribute('y', '44')
    title.setAttribute('font-size', '16')
    title.setAttribute('font-weight', '600')
    title.setAttribute('fill', '#0f172a')
    title.textContent = translate(`caseFlow.${data.step}`)
    status.setAttribute('x', '16')
    status.setAttribute('y', '65')
    status.setAttribute('font-size', '13')
    status.setAttribute('fill', '#475569')
    status.textContent = translate(`caseFlow.${data.status}`)
    card.append(box, title, status)

    return card
  }
}
