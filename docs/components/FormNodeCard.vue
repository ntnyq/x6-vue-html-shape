<script setup lang="ts">
import {
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
  ElSwitch,
} from 'element-plus'
import { computed } from 'vue'
import { useNodeData } from './useNodeData'

interface FormNodeData {
  title: string
  taskName: string
  owner: string
  priority: string
  urgent: boolean
  dueDate: string
}

const PRIORITY_OPTIONS: string[] = ['P0', 'P1', 'P2']

interface X6NodeLike {
  getData: <T = unknown>() => T
  setData: (data: unknown) => void
  on: (event: string, handler: () => void) => void
  off: (event: string, handler: () => void) => void
}

const props = defineProps<{ node: X6NodeLike; graph: unknown }>()
const data = useNodeData<FormNodeData>(props.node)

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
  set: (value: string) => patchData({ dueDate: value }),
})
</script>

<template>
  <div class="x6-vue-node-card border-lime-300 bg-lime-50">
    <div class="mb-2 text-xs font-bold text-lime-900">
      {{ data.title || 'Form Node' }}
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
          <ElSelect v-model="priority">
            <!-- @vue-expect-error types -->
            <ElOption
              v-for="item in PRIORITY_OPTIONS"
              :key="item"
              :label="item"
              :value="item"
            />
          </ElSelect>
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
