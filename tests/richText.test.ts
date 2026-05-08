import { Node } from '@antv/x6'
import { describe, expect, it } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import RichTextNodeCard from '../docs/components/RichTextNodeCard.vue'

describe('rich text node', () => {
  it('shows initial HTML, follows external changes and preserves edits', async () => {
    const node = new Node({
      data: { title: 'Notes', html: '<p>Initial <b>notes</b></p>' },
    })
    const container = document.createElement('div')
    document.body.append(container)
    const app = createApp(() => h(RichTextNodeCard, { node, graph: {} }))
    try {
      app.mount(container)
      await nextTick()
      const editor = container.querySelector<HTMLElement>('[contenteditable]')!
      expect(editor.innerHTML).toBe('<p>Initial <b>notes</b></p>')

      node.setData({ html: '<p>Updated notes</p>' })
      await nextTick()
      expect(editor.innerHTML).toBe('<p>Updated notes</p>')

      editor.append(document.createTextNode(' local edit'))
      editor.dispatchEvent(new Event('input', { bubbles: true }))
      await nextTick()
      expect(node.getData().html).toBe('<p>Updated notes</p> local edit')
      expect(editor.innerHTML).toBe(node.getData().html)
    } finally {
      app.unmount()
      container.remove()
    }
  })
})
