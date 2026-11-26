<script setup lang="ts">
import type { Graph, Node } from '@antv/x6'
import DOMPurify from 'dompurify'
import { ElButton, ElButtonGroup } from 'element-plus'
import { computed, useTemplateRef, watch } from 'vue'
import { useX6NodeData } from 'x6-vue-html-shape'

interface RichTextData {
  title: string
  html: string
}

const props = defineProps<{ node: Node; graph: Graph }>()
const data = useX6NodeData<RichTextData | undefined>(props.node)
const editorRef = useTemplateRef<HTMLDivElement>('editor')

const htmlValue = computed(() => data.value?.html || '')

function cleanHtml(html: string) {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}

watch(
  [htmlValue, editorRef],
  ([value, editor]) => {
    if (!editor) {
      return
    }

    const safeHtml = cleanHtml(value)

    if (editor.innerHTML !== safeHtml) {
      editor.innerHTML = safeHtml
    }
  },
  { immediate: true, flush: 'post' },
)

function patchData(patch: Partial<RichTextData>) {
  props.node.setData({
    ...data.value,
    ...patch,
  })
}

function runCommand(command: string) {
  if (!editorRef.value) {
    return
  }

  editorRef.value.focus()
  document.execCommand(command)
  onInput()
}

function onInput() {
  patchData({ html: cleanHtml(editorRef.value?.innerHTML || '') })
}
</script>

<template>
  <div class="x6-vue-node-card border-slate-300 bg-white p-3">
    <div class="mb-2 flex items-center justify-between gap-2">
      <div class="text-xs font-semibold text-stone-700">
        {{ data?.title || 'Rich Text Node' }}
      </div>
      <ElButtonGroup
        data-x6-vue-stop
        @mousedown.prevent
      >
        <ElButton
          size="small"
          aria-label="Bold"
          @click="runCommand('bold')"
          >B</ElButton
        >
        <ElButton
          size="small"
          aria-label="Italic"
          @click="runCommand('italic')"
          >I</ElButton
        >
        <ElButton
          size="small"
          aria-label="Underline"
          @click="runCommand('underline')"
          >U</ElButton
        >
      </ElButtonGroup>
    </div>

    <div
      ref="editor"
      class="h-28 w-full overflow-auto rounded border border-dashed border-stone-300 bg-stone-50 p-2 text-xs leading-5 outline-none"
      role="textbox"
      aria-label="Note content"
      aria-multiline="true"
      contenteditable="true"
      data-x6-vue-stop
      @input="onInput"
    />
  </div>
</template>
