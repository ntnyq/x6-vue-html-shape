<script setup lang="ts">
import { ElButton, ElButtonGroup } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useNodeData } from './useNodeData'

interface RichTextData {
  title: string
  html: string
}

interface X6NodeLike {
  getData: <T = unknown>() => T
  setData: (data: unknown) => void
  on: (event: string, handler: () => void) => void
  off: (event: string, handler: () => void) => void
}

const props = defineProps<{ node: X6NodeLike; graph: unknown }>()
const data = useNodeData<RichTextData>(props.node)
const editorRef = ref<HTMLDivElement>()

const htmlValue = computed(() => data.value?.html || '')

watch(
  [htmlValue, editorRef],
  ([value, editor]) => {
    if (!editor) {
      return
    }

    if (editor.innerHTML !== value) {
      editor.innerHTML = value
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
  patchData({ html: editorRef.value.innerHTML })
}

function onInput() {
  patchData({ html: editorRef.value?.innerHTML || '' })
}
</script>

<template>
  <div class="x6-vue-node-card border-slate-300 bg-white p-3">
    <div class="mb-2 flex items-center justify-between gap-2">
      <div class="text-xs font-semibold text-stone-700">
        {{ data.title || 'Rich Text Node' }}
      </div>
      <ElButtonGroup data-x6-vue-stop>
        <ElButton
          size="small"
          @click="runCommand('bold')"
          >B</ElButton
        >
        <ElButton
          size="small"
          @click="runCommand('italic')"
          >I</ElButton
        >
        <ElButton
          size="small"
          @click="runCommand('underline')"
          >U</ElButton
        >
      </ElButtonGroup>
    </div>

    <div
      ref="editorRef"
      class="h-28 w-full overflow-auto rounded border border-dashed border-stone-300 bg-stone-50 p-2 text-xs leading-5 outline-none"
      contenteditable="true"
      data-x6-vue-stop
      @input="onInput"
    />
  </div>
</template>
