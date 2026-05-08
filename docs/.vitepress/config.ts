import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vitepress'

export default defineConfig({
  cleanUrls: true,
  description:
    'Documentation for rendering X6 Vue nodes through an HTML overlay, avoiding foreignObject Safari compatibility issues.',
  lang: 'en-US',
  themeConfig: {
    nav: [
      { link: '/guide/getting-started', text: 'Guide' },
      { link: '/guide/comparison', text: 'Comparison' },
      { link: '/api/index', text: 'API Reference' },
      {
        activeMatch: '/(playground|examples/)',
        link: '/playground',
        text: 'Playground',
      },
    ],
    sidebar: {
      '/api/': [
        {
          items: [{ link: '/api/index', text: 'Complete API' }],
          text: 'API Reference',
        },
      ],
      '/examples/': [
        {
          items: [
            { link: '/examples/text-node', text: 'Text Node' },
            { link: '/examples/rich-text-node', text: 'Rich Text Node' },
            { link: '/examples/form-node', text: 'Form Node' },
            { link: '/examples/mixed-board', text: 'Mixed Board' },
          ],
          text: 'Examples',
        },
      ],
      '/guide/': [
        {
          items: [
            {
              link: '/guide/getting-started',
              text: 'Getting Started',
            },
            {
              link: '/guide/vue-context',
              text: 'Vue Context',
            },
            {
              link: '/guide/comparison',
              text: 'Official Package Comparison',
            },
            {
              link: '/guide/migration',
              text: 'Migration',
            },
            {
              link: '/guide/production-readiness',
              text: 'Production Readiness',
            },
          ],
          text: 'Guide',
        },
      ],
    },
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/ntnyq/x6-extension-vue-shape',
      },
    ],
  },
  title: 'x6-vue-html-shape',
  vite: {
    plugins: [
      UnoCSS({
        inspector: false,
      }),
    ],
  },
})
