import { fileURLToPath } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [Vue()],
  resolve: {
    alias: {
      // X6 3.1.8 declares ESM but its main entry contains CommonJS.
      '@antv/x6': fileURLToPath(
        new URL('node_modules/@antv/x6/es/index.js', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/*.test.ts'],
    server: {
      // Transform X6's extensionless ESM imports through Vite.
      deps: {
        inline: [/@antv\/x6/u],
      },
    },
    watch: false,
  },
})
