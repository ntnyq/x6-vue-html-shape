---
layout: home

hero:
  name: X6 Vue HTML Shape
  text: Vue components as X6 nodes
  tagline: Render Vue 3 components in an HTML overlay with X6 3. Follow graph transforms, share Vue context and evaluate the documented export and layering tradeoffs.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Open Playground
      link: /playground
    - theme: alt
      text: Compare with Official
      link: /guide/comparison
    - theme: alt
      text: GitHub
      link: https://github.com/ntnyq/x6-extension-vue-shape

features:
  - title: HTML Overlay Rendering
    details: Follow X6 movement, rotation and affine transforms through a shared HTML-layer matrix, without generating SVG foreignObject.
    link: /guide/getting-started
    linkText: Get started
  - title: Shared Vue Context
    details: Mount one Teleport host per graph to inherit scoped providers and global components. Standalone mounting remains available.
    link: /guide/vue-context
    linkText: Configure the host
  - title: Explicit Validation Boundaries
    details: Review real-browser coverage, comparison with the official renderer, and remaining export, plugin and target-device acceptance work.
    link: /guide/production-readiness
    linkText: Check production readiness
  - title: Text Nodes
    details: Register Vue text cards, connect them on the canvas, and style their content with UnoCSS utility classes.
    link: /examples/text-node
    linkText: View text node example
  - title: Rich Text Nodes
    details: Edit content directly inside a node with Element Plus formatting buttons and reactive node data.
    link: /examples/rich-text-node
    linkText: View rich text example
  - title: Form Nodes
    details: Use Element Plus inputs, selects, and date pickers inside nodes, with edits synchronized back to node data.
    link: /examples/form-node
    linkText: View form example
  - title: Mixed Board
    details: Combine text cards, rich text editors, and form panels in one X6 graph with a shared synchronization setup.
    link: /examples/mixed-board
    linkText: Explore the mixed board
---
