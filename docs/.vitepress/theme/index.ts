import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import 'element-plus/dist/index.css'
import 'x6-vue-html-shape/style.css'
import 'uno.css'
import './custom.css'

const theme: Theme = {
  ...DefaultTheme,
}

export default theme
