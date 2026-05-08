<script setup lang="ts">
import { useRouter, withBase } from 'vitepress'
import { computed } from 'vue'
import { DEMOS } from './demos'
import type { DemoType } from './demos'
import PlaygroundCanvas from './PlaygroundCanvas.vue'

const props = defineProps<{ demo: DemoType }>()
const router = useRouter()
const currentDemo = computed(() => DEMOS[props.demo])

async function changeDemo(event: Event) {
  if (event.target instanceof HTMLSelectElement) {
    await router.go(withBase(`/examples/${event.target.value}`))
  }
}
</script>

<template>
  <main
    class="playground flex flex-col"
    aria-label="Interactive playground"
  >
    <header
      class="playground-header flex flex-wrap items-center justify-between gap-4 px-6 py-4"
    >
      <div class="min-w-0">
        <h1 class="text-xl font-semibold tracking-tight">Playground</h1>
        <p class="mt-1 text-sm text-[var(--vp-c-text-2)]">
          {{ currentDemo.description }}
        </p>
      </div>
      <label class="ml-auto flex shrink-0 items-center gap-3 text-sm">
        <span class="text-[var(--vp-c-text-2)]">Demo</span>
        <select
          class="playground-select rounded-lg border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)] px-3 py-2 font-medium"
          :value="demo"
          @change="changeDemo"
        >
          <option
            v-for="(item, key) in DEMOS"
            :key="key"
            :value="key"
          >
            {{ item.title }}
          </option>
        </select>
      </label>
    </header>
    <PlaygroundCanvas
      :key="demo"
      :demo="demo"
    />
  </main>
</template>
