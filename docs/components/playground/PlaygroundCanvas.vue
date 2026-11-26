<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { createCaseFlowSvgRenderer } from './caseFlow'
import type { DemoType } from './demos'
import { usePlaygroundGraph } from './usePlaygroundGraph'

const props = defineProps<{
  demo: DemoType
}>()

const container = useTemplateRef<HTMLDivElement>('canvas')

const { locale, t: translate } = useI18n()

const {
  status,
  zoom,
  zoomLabel,
  teleportHost,
  fit,
  zoomBy,
  reset,
  downloadCaseFlow,
} = usePlaygroundGraph(container, props.demo)

function download(format: 'svg' | 'png') {
  const language = locale.value

  downloadCaseFlow(
    format,
    createCaseFlowSvgRenderer(language, key =>
      translate(key, {}, { locale: language }),
    ),
  )
}
</script>

<template>
  <component
    v-if="teleportHost"
    :is="teleportHost"
  />
  <div class="relative min-h-0 flex-1 overflow-hidden">
    <div
      ref="canvas"
      class="playground-canvas absolute inset-0"
      role="region"
      aria-label="Graph canvas"
      :aria-busy="status === 'loading'"
    />
    <div
      v-if="status !== 'ready'"
      class="absolute inset-0 z-10 flex items-center justify-center bg-[var(--vp-c-bg)] text-sm"
      :role="status === 'error' ? 'alert' : 'status'"
    >
      {{
        status === 'error'
          ? 'The demo could not load. Reload the page to try again.'
          : 'Loading demo…'
      }}
    </div>
  </div>
  <footer
    class="playground-footer flex flex-wrap items-center justify-between gap-3 px-6 py-3"
  >
    <p class="text-xs text-[var(--vp-c-text-2)]">
      Drag nodes to move · Drag canvas to pan · Ctrl / ⌘ + scroll to zoom
    </p>
    <div class="ml-auto flex flex-wrap items-center gap-2">
      <label
        v-if="demo === 'case-flow'"
        class="flex items-center gap-2 text-sm"
      >
        Card language
        <select
          v-model="locale"
          class="playground-select rounded-lg border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)] px-2 py-1"
        >
          <option value="en">English</option>
          <option value="zh-CN">简体中文</option>
        </select>
      </label>
      <button
        class="playground-button"
        type="button"
        aria-label="Zoom out"
        :disabled="status !== 'ready' || zoom <= 0.2"
        @click="zoomBy(1 / 1.2)"
      >
        −
      </button>
      <output
        class="w-12 text-center text-xs tabular-nums"
        aria-label="Zoom level"
        >{{ zoomLabel }}</output
      >
      <button
        class="playground-button"
        type="button"
        aria-label="Zoom in"
        :disabled="status !== 'ready' || zoom >= 2"
        @click="zoomBy(1.2)"
      >
        +
      </button>
      <button
        class="playground-button"
        type="button"
        :disabled="status !== 'ready'"
        @click="fit"
      >
        Fit view
      </button>
      <button
        class="playground-button"
        type="button"
        :disabled="status !== 'ready'"
        @click="reset"
      >
        Reset
      </button>
      <template v-if="demo === 'case-flow'">
        <button
          class="playground-button"
          type="button"
          :disabled="status !== 'ready'"
          @click="download('svg')"
        >
          Export SVG
        </button>
        <button
          class="playground-button"
          type="button"
          :disabled="status !== 'ready'"
          @click="download('png')"
        >
          Export PNG
        </button>
      </template>
    </div>
  </footer>
</template>
