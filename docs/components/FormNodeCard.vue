<script setup lang="ts">
import type { Graph, Node } from '@antv/x6'
import {
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElSwitch,
} from 'element-plus'
import { computed } from 'vue'
import type { Component } from 'vue'
import { useX6NodeData } from 'x6-vue-html-shape'

interface FormNodeData {
  title: string
  taskName: string
  owner: string
  priority: string
  urgent: boolean
  dueDate: string
}

const PRIORITY_OPTIONS = ['P0', 'P1', 'P2'].map(value => ({
  label: value,
  value,
}))
// Element Plus exposes the options prop definition as its value type.
const PrioritySelect = ElSelect as unknown as Component<{
  modelValue: string
  options: typeof PRIORITY_OPTIONS
  'onUpdate:modelValue'?: (value: string) => void
}>

const props = defineProps<{ node: Node; graph: Graph }>()
const data = useX6NodeData<FormNodeData | undefined>(props.node)

function patchData(patch: Partial<FormNodeData>) {
  props.node.setData({
    ...data.value,
    ...patch,
  })
}

const taskName = computed({
  get: () => data.value?.taskName || '',
  set: (value: string) => patchData({ taskName: value }),
})

const owner = computed({
  get: () => data.value?.owner || '',
  set: (value: string) => patchData({ owner: value }),
})

const priority = computed<string>({
  get: () => data.value?.priority || 'P1',
  set: value => patchData({ priority: value }),
})

const urgent = computed({
  get: () => Boolean(data.value?.urgent),
  set: (value: boolean) => patchData({ urgent: value }),
})

const dueDate = computed({
  get: () => data.value?.dueDate || '',
  set: (value: string | null) => patchData({ dueDate: value ?? '' }),
})
</script>

<template>
  <div class="x6-vue-node-card border-lime-300 bg-lime-50">
    <div class="mb-2 text-xs font-bold text-lime-900">
      {{ data?.title || 'Form Node' }}
    </div>

    <ElForm
      label-position="top"
      size="small"
      data-x6-vue-stop
    >
      <ElFormItem label="Task Name">
        <ElInput
          v-model="taskName"
          placeholder="Enter task name"
        />
      </ElFormItem>

      <ElFormItem label="Owner">
        <ElInput
          v-model="owner"
          placeholder="Enter owner"
        />
      </ElFormItem>

      <div class="grid grid-cols-2 gap-2">
        <ElFormItem label="Priority">
          <PrioritySelect
            v-model="priority"
            :options="PRIORITY_OPTIONS"
          />
        </ElFormItem>

        <ElFormItem label="Urgent">
          <ElSwitch v-model="urgent" />
        </ElFormItem>
      </div>

      <ElFormItem label="Due Date">
        <ElDatePicker
          v-model="dueDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="Select date"
          class="w-full"
        />
      </ElFormItem>
    </ElForm>
  </div>
</template>
