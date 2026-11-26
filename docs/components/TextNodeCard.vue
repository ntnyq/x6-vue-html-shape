<script setup lang="ts">
import type { Graph, Node } from '@antv/x6'
import { computed } from 'vue'
import { useX6NodeData } from 'x6-vue-html-shape'

interface TextNodeData {
  title: string
  description: string
  tone: 'teal' | 'orange' | 'sky'
}

const props = defineProps<{ node: Node; graph: Graph }>()
const data = useX6NodeData<TextNodeData | undefined>(props.node)

const toneClass = computed(() => {
  switch (data.value?.tone) {
    case 'orange': {
      return 'bg-orange-50 border-orange-200'
    }
    case 'sky': {
      return 'bg-sky-50 border-sky-200'
    }
    default: {
      return 'bg-teal-50 border-teal-200'
    }
  }
})
</script>

<template>
  <div
    class="x6-vue-node-card flex h-full w-full flex-col justify-between border"
    :class="toneClass"
  >
    <div class="text-sm font-semibold tracking-wide text-stone-700">
      {{ data?.title }}
    </div>
    <p class="overflow-hidden text-xs leading-5 text-stone-500">
      {{ data?.description }}
    </p>
  </div>
</template>
