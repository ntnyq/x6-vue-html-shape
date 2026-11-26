export const DEMOS = {
  'mixed-board': {
    title: 'Mixed board',
    description: 'Text, rich text and forms connected in one workflow.',
  },
  'text-node': {
    title: 'Text nodes',
    description: 'Drag a card and watch its connections follow.',
  },
  'rich-text-node': {
    title: 'Rich text',
    description:
      'Edit notes directly inside a node. Drag its header to move it.',
  },
  'form-node': {
    title: 'Forms',
    description:
      'Try inputs, selections and date pickers. Drag a header to move.',
  },
  'case-flow': {
    title: 'Case flow',
    description:
      'Switch card languages to see Vue context shared through a graph-specific Teleport host.',
  },
}

export type DemoType = keyof typeof DEMOS
