<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useX6NodeData } from 'x6-vue-html-shape'
import type { VueShapeComponentProps } from 'x6-vue-html-shape'
import type { CaseFlowNodeData } from './caseFlow'

const props = defineProps<VueShapeComponentProps>()

const { locale, t: translate } = useI18n()

const data = useX6NodeData<CaseFlowNodeData>(props.node)
</script>

<template>
  <article
    class="case-flow-card"
    :lang="locale"
  >
    <h2>{{ translate(`caseFlow.${data.step}`) }}</h2>
    <p>{{ translate(`caseFlow.${data.status}`) }}</p>
  </article>
</template>

<style scoped>
.case-flow-card {
  display: flex;
  height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--vp-c-divider);
  border-inline-start: 4px solid var(--vp-c-brand-1);
  border-radius: 8px;
  background: var(--vp-c-bg);
  padding: 16px;
}

.case-flow-card h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.case-flow-card p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
</style>
