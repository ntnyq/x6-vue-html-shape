import type { Graph } from '@antv/x6'
import { registerVueHtmlNode } from 'x6-vue-html-shape'
import FormNodeCard from '../FormNodeCard.vue'
import RichTextNodeCard from '../RichTextNodeCard.vue'
import TextNodeCard from '../TextNodeCard.vue'

export function registerDemoShapes() {
  for (const [shape, component] of [
    ['demo-text-node', TextNodeCard],
    ['demo-rich-text-node', RichTextNodeCard],
    ['demo-form-node', FormNodeCard],
    ['demo-mixed-text', TextNodeCard],
    ['demo-mixed-rich', RichTextNodeCard],
    ['demo-mixed-form', FormNodeCard],
  ] as const) {
    registerVueHtmlNode({ shape, component, overwrite: true })
  }
}

export const DEMO_SCENES = {
  'text-node': (graph: Pick<Graph, 'addNode' | 'addEdge'>) => {
    graph.addNode({
      id: 'text-node-1',
      shape: 'demo-text-node',
      x: 60,
      y: 70,
      width: 230,
      height: 110,
      data: {
        title: 'Backlog',
        description:
          'Collect and classify incoming tasks by impact and complexity.',
        tone: 'teal',
      },
    })

    graph.addNode({
      id: 'text-node-2',
      shape: 'demo-text-node',
      x: 360,
      y: 210,
      width: 230,
      height: 110,
      data: {
        title: 'In Progress',
        description:
          'Split tasks, implement features, and move to integration.',
        tone: 'orange',
      },
    })

    graph.addNode({
      id: 'text-node-3',
      shape: 'demo-text-node',
      x: 650,
      y: 95,
      width: 230,
      height: 110,
      data: {
        title: 'Released',
        description: 'Merge to main and monitor key metrics after deployment.',
        tone: 'sky',
      },
    })

    graph.addEdge({
      source: { cell: 'text-node-1', anchor: 'right' },
      target: { cell: 'text-node-2', anchor: 'left' },
      attrs: {
        line: {
          stroke: '#14b8a6',
          strokeWidth: 2,
        },
      },
    })

    graph.addEdge({
      source: { cell: 'text-node-2', anchor: 'right' },
      target: { cell: 'text-node-3', anchor: 'left' },
      attrs: {
        line: {
          stroke: '#0ea5e9',
          strokeWidth: 2,
        },
      },
    })
  },
  'rich-text-node': (graph: Pick<Graph, 'addNode' | 'addEdge'>) => {
    graph.addNode({
      id: 'rich-text-node-1',
      shape: 'demo-rich-text-node',
      x: 120,
      y: 70,
      width: 340,
      height: 210,
      data: {
        title: 'Release Notes',
        html: '<p><b>v2.3</b> is live with rich text editing for graph nodes.</p><p>Write notes directly inside the node and highlight key points.</p>',
      },
    })

    graph.addNode({
      id: 'rich-text-node-2',
      shape: 'demo-rich-text-node',
      x: 520,
      y: 230,
      width: 340,
      height: 210,
      data: {
        title: 'Meeting Notes',
        html: '<p>1. Finish integration next week</p><p>2. Expand E2E test coverage</p>',
      },
    })

    graph.addEdge({
      source: { cell: 'rich-text-node-1', anchor: 'right' },
      target: { cell: 'rich-text-node-2', anchor: 'left' },
      attrs: {
        line: {
          stroke: '#2563eb',
          strokeWidth: 2,
        },
      },
    })
  },
  'form-node': (graph: Pick<Graph, 'addNode' | 'addEdge'>) => {
    graph.addNode({
      id: 'form-node-1',
      shape: 'demo-form-node',
      x: 100,
      y: 60,
      width: 360,
      height: 350,
      data: {
        title: 'Requirement Intake',
        taskName: 'Implement rich text node',
        owner: 'Alice',
        priority: 'P1',
        urgent: true,
        dueDate: '2026-05-20',
      },
    })

    graph.addNode({
      id: 'form-node-2',
      shape: 'demo-form-node',
      x: 520,
      y: 170,
      width: 360,
      height: 350,
      data: {
        title: 'QA Task',
        taskName: 'Add API documentation snapshots',
        owner: 'Bob',
        priority: 'P2',
        urgent: false,
        dueDate: '2026-05-28',
      },
    })

    graph.addEdge({
      source: { cell: 'form-node-1', anchor: 'right' },
      target: { cell: 'form-node-2', anchor: 'left' },
      attrs: {
        line: {
          stroke: '#65a30d',
          strokeWidth: 2,
        },
      },
    })
  },
  'mixed-board': (graph: Pick<Graph, 'addNode' | 'addEdge'>) => {
    graph.addNode({
      id: 'mixed-board-1',
      shape: 'demo-mixed-text',
      x: 40,
      y: 90,
      width: 240,
      height: 110,
      data: {
        title: 'Summary Card',
        description: 'Show entry status and key tags for the flow.',
        tone: 'teal',
      },
    })

    graph.addNode({
      id: 'mixed-board-2',
      shape: 'demo-mixed-rich',
      x: 330,
      y: 40,
      width: 320,
      height: 220,
      data: {
        title: 'Iteration Notes',
        html: '<p><b>Goal:</b> unify node interaction experience.</p><p>Support editing, input, and viewing in one flow.</p>',
      },
    })

    graph.addNode({
      id: 'mixed-board-3',
      shape: 'demo-mixed-form',
      x: 700,
      y: 90,
      width: 360,
      height: 360,
      data: {
        title: 'Execution Panel',
        taskName: 'Publish x6 Vue node rendering solution',
        owner: 'Carol',
        priority: 'P0',
        urgent: true,
        dueDate: '2026-05-30',
      },
    })

    graph.addEdge({
      source: { cell: 'mixed-board-1', anchor: 'right' },
      target: { cell: 'mixed-board-2', anchor: 'left' },
      attrs: { line: { stroke: '#0f766e', strokeWidth: 2 } },
    })

    graph.addEdge({
      source: { cell: 'mixed-board-2', anchor: 'right' },
      target: { cell: 'mixed-board-3', anchor: 'left' },
      attrs: { line: { stroke: '#0891b2', strokeWidth: 2 } },
    })
  },
}
