<script setup lang="ts">
import { useTemplateRef } from 'vue'
import type { DemoType } from './demos'
import { usePlaygroundGraph } from './usePlaygroundGraph'

const props = defineProps<{ demo: DemoType }>()
const container = useTemplateRef<HTMLDivElement>('canvas')

const { status, zoom, zoomLabel, fit, zoomBy, reset } = usePlaygroundGraph(
  container,
  props.demo,
)
</script>

<template>
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
    </div>
  </footer>
</template>
