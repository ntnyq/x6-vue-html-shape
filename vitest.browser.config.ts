import { fileURLToPath } from 'node:url'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@antv/x6': fileURLToPath(
        new URL('node_modules/@antv/x6/es/index.js', import.meta.url),
      ),
    },
  },
  test: {
    api: {
      host: '127.0.0.1',
    },
    browser: {
      enabled: true,
      headless: true,
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox' },
        { browser: 'webkit' },
      ],
      provider: playwright(),
    },
    include: ['tests/browser/*.test.ts'],
    watch: false,
  },
})
