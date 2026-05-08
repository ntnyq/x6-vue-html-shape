# `x6-vue-html-shape` 生成与实现计划

> 本文保留最初的设计提案。当前实现已增加按 Graph 隔离的 Teleport、完整矩阵同步及浏览器回归测试；实现状态与生产验收边界以 [Production readiness](docs/guide/production-readiness.md) 为准。HTML overlay 与 Teleport 分别解决 DOM 位置和 Vue 上下文继承，可以配合使用。

## 当前状态索引（2026-09-14）

- 包名：`x6-vue-html-shape`；开发版本：`0.0.0`；支持 Vue `^3.3.0` / X6 `^3.0.0`。
- 已实现：独立 HTML overlay、完整矩阵和节点旋转同步、Graph 级 Teleport、动态属性、组件复用、交互保护与自动销毁。
- 已验证：45 项单元测试；6 个浏览器场景分别在 Chromium / Firefox / WebKit 执行，共 18 次。
- 尚未完成：HTML 导出合成、跨 SVG/HTML 任意层级交错、完整插件兼容矩阵、Safari/iOS 真机验收与官方对照性能基准。
- 当前 API、使用方式、默认值和限制以 [API 文档](docs/api/index.md)、[官方能力对比](docs/guide/comparison.md)、[迁移指南](docs/guide/migration.md) 为准。

下文的代码、能力对齐表和步骤属于历史方案，不是当前实现的完整规格。例如 Vue 2 / `vue-demi` 支持、无需 Teleport 的建议和全量位置同步方案都不能作为当前能力声明。

> 目标：实现一个与 `@antv/x6-vue-shape` 使用体验尽量对齐、但不依赖 SVG `foreignObject` 的 Vue 节点渲染扩展包。  
> 核心策略：X6 继续负责节点模型、边、端口、连线、拖拽、缩放、选择、对齐线等图编辑能力；Vue 组件渲染到独立 HTML Overlay Layer，通过绝对定位与 CSS transform 跟随 X6 节点。

---

## 1. 背景与问题

### 1.1 当前 `@antv/x6-vue-shape` 的能力

官方 `@antv/x6-vue-shape` 的定位是：

```txt
X6 shape for rendering vue components.
```

它提供的主要能力包括：

1. 注册 `vue-shape` 节点。
2. 注册 `vue-shape-view` 视图。
3. 在 X6 节点中通过 `component` 渲染 Vue 组件。
4. 组件内可通过 props 获取：
   - `node`
   - `graph`
5. 组件内可通过 provide/inject 获取：
   - `getNode`
   - `getGraph`
6. 支持 Vue 2 / Vue 3，依赖 `vue-demi`。
7. 支持 `primer`，即在 Vue 内容背后追加一个基础 SVG 图形，如：
   - `rect`
   - `circle`
   - `path`
   - `ellipse`
   - `polygon`
   - `polyline`
8. 支持 teleport 相关逻辑。
9. 在 input 文本类元素上阻止 X6 默认 mousedown 逻辑，避免输入框无法正常聚焦。

### 1.2 当前实现的核心问题

官方实现的关键点是：

```ts
const content = Markup.getForeignObjectMarkup()
```

也就是说，它将 Vue 组件挂载到 SVG `foreignObject` 内部。

这会带来 Safari / iOS Safari 兼容性问题。典型表现包括：

1. Vue 节点内容被渲染到 SVG 左上角。
2. 节点真实 DOM 检查位置正确，但视觉绘制位置错误。
3. 节点内一旦使用 `position`、`transform`、`transition`、`backface-visibility`、`will-change` 等 CSS，问题更容易出现。
4. Element Plus、动画组件、弹层、过渡组件、复杂卡片布局等都可能触发。

### 1.3 新包设计目标

包名：

```txt
x6-vue-html-shape
```

本文以下统一以 `x6-vue-html-shape` 为包名。

设计目标：

1. 不使用 `foreignObject`。
2. 尽量兼容 `@antv/x6-vue-shape` 的使用方式。
3. 保留 `vue-shape` 的迁移路径。
4. 支持 Vue 3 优先，必要时通过 `vue-demi` 兼容 Vue 2。
5. Vue 节点渲染到 X6 容器内的 HTML Overlay Layer。
6. 节点位置、大小、缩放、平移与 X6 Graph 同步。
7. 支持节点交互、输入框、按钮、下拉框、Tooltip、Popover 等普通 HTML 能力。
8. 支持 `node` / `graph` props。
9. 支持 `getNode` / `getGraph` provide/inject。
10. 支持 `component` 属性变更后重新渲染。
11. 支持节点 data 变更后响应式刷新。
12. 支持销毁清理，避免内存泄漏。
13. 提供迁移文档与兼容模式。

---

## 2. 与官方 `@antv/x6-vue-shape` 的能力对齐表

| 能力               | 官方 `@antv/x6-vue-shape` | 新包目标                                      | 说明                                                |
| ------------------ | ------------------------- | --------------------------------------------- | --------------------------------------------------- |
| 注册节点名         | `vue-shape`               | 默认兼容 `vue-shape`，也提供 `vue-html-shape` | 可配置是否覆盖                                      |
| Vue 组件渲染       | 支持                      | 支持                                          | 不再渲染到 `foreignObject`                          |
| Vue 2              | 支持                      | 可选支持                                      | 建议 Vue 3 优先                                     |
| Vue 3              | 支持                      | 支持                                          | 核心目标                                            |
| `vue-demi`         | 使用                      | 可选                                          | 如果只服务 Vue 3，可不使用                          |
| props.node         | 支持                      | 支持                                          | 对齐                                                |
| props.graph        | 支持                      | 支持                                          | 对齐                                                |
| provide `getNode`  | 支持                      | 支持                                          | 对齐                                                |
| provide `getGraph` | 支持                      | 支持                                          | 对齐                                                |
| `component` 配置   | 支持                      | 支持                                          | 对齐                                                |
| `primer`           | 支持                      | 部分支持                                      | 基础 SVG 背板可保留                                 |
| `foreignObject`    | 使用                      | 不使用                                        | 规避 Safari bug                                     |
| Teleport           | 有内部实现                | 建议不再内置同等机制                          | 因为本身已经是 HTML 层，很多场景不需要额外 teleport |
| input 聚焦处理     | 支持                      | 支持                                          | 需要阻止 X6 拖拽抢事件                              |
| 节点缩放           | SVG 原生跟随              | HTML 层手动同步                               | 需要监听 scale / translate / resize                 |
| 导出图片           | SVG 导出天然包含          | 需要额外合成 HTML 层                          | 新实现的重要限制                                    |
| zIndex             | SVG 内统一排序            | HTML 层与 SVG 层分离                          | 需要约定层级策略                                    |
| ports / magnet     | SVG 内天然支持            | 建议保留在 SVG 层                             | Vue 内容只负责展示和业务交互                        |

---

## 3. 总体架构

### 3.1 原官方方案

```txt
Graph Container
└── SVG
    └── Node Group
        └── foreignObject
            └── div
                └── Vue Component
```

问题：`foreignObject` 内 HTML 受 Safari/WebKit bug 影响。

### 3.2 新方案

```txt
Graph Container
├── SVG Layer
│   ├── nodes / edges / ports / selection / tools
│   └── transparent node body
└── HTML Vue Layer
    ├── Vue Node A
    ├── Vue Node B
    └── Vue Node C
```

核心思想：

1. X6 节点仍然存在。
2. X6 节点可以是透明 SVG rect，也可以保留基础 `primer` 图形。
3. Vue 组件不进入 SVG。
4. Vue 组件挂载到 Graph 容器下的绝对定位 HTML 层。
5. Vue 组件的位置由节点 `bbox` + Graph `scale` + Graph `translate` 计算得出。

---

## 4. 包目录结构设计

推荐目录：

```txt
x6-vue-html-shape/
├── docs/
│   ├── migration-from-antv-x6-vue-shape.md
│   ├── safari-foreign-object.md
│   ├── limitations.md
│   └── examples.md
├── examples/
│   ├── vite-vue3/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── App.vue
│   │   │   ├── main.ts
│   │   │   ├── nodes/
│   │   │   │   ├── UserNode.vue
│   │   │   │   └── FormNode.vue
│   │   │   └── graph.ts
│   │   └── vite.config.ts
│   └── playground/
├── src/
│   ├── index.ts
│   ├── install.ts
│   ├── constants.ts
│   ├── types.ts
│   ├── node.ts
│   ├── view.ts
│   ├── layer.ts
│   ├── registry.ts
│   ├── sync.ts
│   ├── events.ts
│   ├── utils/
│   │   ├── browser.ts
│   │   ├── dom.ts
│   │   ├── x6.ts
│   │   └── vue.ts
│   └── style.css
├── test/
│   ├── unit/
│   │   ├── registry.test.ts
│   │   ├── layer.test.ts
│   │   ├── sync.test.ts
│   │   └── events.test.ts
│   ├── e2e/
│   │   ├── vue-html-shape.spec.ts
│   │   ├── interaction.spec.ts
│   │   ├── zoom-pan.spec.ts
│   │   └── safari.spec.ts
│   └── fixtures/
│       ├── UserNode.vue
│       └── FormNode.vue
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── eslint.config.mjs
├── README.md
├── CHANGELOG.md
└── LICENSE
```

---

## 5. 类型设计

### 5.1 基础类型

文件：`src/types.ts`

```ts
import type { Graph, Node, NodeProperties } from '@antv/x6'
import type { App, Component, Plugin } from 'vue'

export type Primer =
  'rect' | 'circle' | 'path' | 'ellipse' | 'polygon' | 'polyline'

export interface VueShapeContext<N extends Node = Node> {
  node: N
  graph: Graph
}

export type VueShapeComponent<N extends Node = Node> = Component<{
  node: N
  graph: Graph
}>

export interface VueShapeComponentProps<N extends Node = Node> {
  node: N
  graph: Graph
}

export interface VueShapeProvide<N extends Node = Node> {
  getNode: () => N
  getGraph: () => Graph
}
```

### 5.2 节点配置类型

```ts
export interface VueHtmlShapeProperties extends NodeProperties {
  /** Vue 组件。尽量兼容官方 x6-vue-shape 的 component 字段。 */
  component?: Component

  /** 基础 SVG 背板，兼容官方 primer。 */
  primer?: Primer

  /** HTML 节点 class。 */
  htmlClassName?: string

  /** HTML 节点 style。 */
  htmlStyle?: Partial<CSSStyleDeclaration>

  /** 是否让 HTML 节点接收鼠标事件。 */
  interactive?: boolean

  /** 是否缩放 HTML 内容。默认 true。 */
  scaleContent?: boolean

  /** 是否同步节点 visible 状态。默认 true。 */
  syncVisible?: boolean

  /** 是否启用 Safari 安全模式。默认 true。 */
  safariSafe?: boolean

  /** 自定义挂载容器。默认挂载到 graph.container 内部 overlay layer。 */
  getContainer?: (graph: Graph, node: Node) => HTMLElement

  /** 传给 Vue 组件的额外 props。 */
  props?: Record<string, unknown>

  /** 是否保持组件实例，仅更新 props；默认 true。 */
  keepAliveOnUpdate?: boolean
}
```

### 5.3 注册配置类型

```ts
export interface RegisterVueHtmlShapeOptions {
  /** 注册的 X6 shape 名称。默认 vue-html-shape。 */
  shape?: string

  /** 是否同时注册兼容官方的 vue-shape。默认 false，迁移期可打开。 */
  compatibleShapeName?: boolean

  /** 是否覆盖已存在 shape。默认 false。 */
  overwrite?: boolean

  /** 默认 primer。 */
  primer?: Primer

  /** 默认 Vue 组件。 */
  component?: Component
}

export interface VueHtmlShapePluginOptions extends RegisterVueHtmlShapeOptions {
  /** 是否自动注入样式。默认 true。 */
  injectStyle?: boolean
}
```

### 5.4 内部状态类型

```ts
export interface VueHtmlLayerState {
  root: HTMLElement
  graph: Graph
  nodes: Map<string, HTMLElement>
}

export interface MountedVueInstance {
  app: App<Element>
  root: HTMLElement
  component: Component
}
```

---

## 6. 核心实现计划

## 6.1 常量

文件：`src/constants.ts`

```ts
export const DEFAULT_SHAPE_NAME = 'vue-html-shape'
export const COMPAT_SHAPE_NAME = 'vue-shape'
export const DEFAULT_VIEW_NAME = 'vue-html-shape-view'
export const HTML_LAYER_CLASS = 'x6-vue-html-layer'
export const HTML_NODE_CLASS = 'x6-vue-html-node'
export const HTML_NODE_CONTENT_CLASS = 'x6-vue-html-node-content'
export const STYLE_ID = 'x6-vue-html-shape-style'
```

---

## 6.2 组件注册表

文件：`src/registry.ts`

```ts
import type { Component } from 'vue'

export interface ShapeRegistryItem {
  component?: Component
}

const shapeMaps = new Map<string, ShapeRegistryItem>()

export function registerVueShapeComponent(shape: string, component: Component) {
  shapeMaps.set(shape, {
    ...(shapeMaps.get(shape) || {}),
    component,
  })
}

export function getVueShapeComponent(shape: string) {
  return shapeMaps.get(shape)?.component
}

export function unregisterVueShapeComponent(shape: string) {
  shapeMaps.delete(shape)
}

export function clearVueShapeComponents() {
  shapeMaps.clear()
}
```

说明：

1. 官方实现中存在 `shapeMaps`。
2. 新包也保留类似注册表。
3. 允许通过 `node.component` 或注册表组件渲染。
4. 优先级建议：

```txt
node.getProp('component') > registry component by node.shape > default component
```

---

## 6.3 HTML Layer 管理

文件：`src/layer.ts`

```ts
import type { Graph } from '@antv/x6'
import { HTML_LAYER_CLASS } from './constants'

const layerMap = new WeakMap<HTMLElement, HTMLElement>()

export function ensureVueHtmlLayer(graph: Graph): HTMLElement {
  const container = graph.container
  const existed = layerMap.get(container)

  if (existed && container.contains(existed)) {
    return existed
  }

  let layer = container.querySelector<HTMLElement>(`.${HTML_LAYER_CLASS}`)

  if (!layer) {
    layer = document.createElement('div')
    layer.className = HTML_LAYER_CLASS
    container.appendChild(layer)
  }

  const computedStyle = window.getComputedStyle(container)
  if (computedStyle.position === 'static') {
    container.style.position = 'relative'
  }

  layerMap.set(container, layer)

  return layer
}

export function removeVueHtmlLayer(graph: Graph) {
  const container = graph.container
  const layer = layerMap.get(container)
  layer?.remove()
  layerMap.delete(container)
}
```

---

## 6.4 样式注入

文件：`src/style.css`

```css
.x6-vue-html-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 2;
  transform-origin: 0 0;
}

.x6-vue-html-node {
  position: absolute;
  left: 0;
  top: 0;
  box-sizing: border-box;
  transform-origin: 0 0;
  pointer-events: auto;
  contain: layout paint style;
}

.x6-vue-html-node.is-hidden {
  display: none;
}

.x6-vue-html-node.is-non-interactive {
  pointer-events: none;
}

.x6-vue-html-node-content {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}
```

文件：`src/utils/dom.ts`

```ts
import { STYLE_ID } from '../constants'
import css from '../style.css?inline'

export function injectStyle() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = css
  document.head.appendChild(style)
}
```

如果不想依赖 Vite `?inline`，可以：

1. 打包时额外产出 CSS。
2. 让用户手动：

```ts
import 'x6-vue-html-shape/style.css'
```

更推荐手动导入 CSS，包本身也提供 `injectStyle` 作为便捷能力。

---

## 6.5 X6 节点注册

文件：`src/node.ts`

```ts
import { Graph, ObjectExt } from '@antv/x6'
import type { NodeProperties } from '@antv/x6'
import type { Primer, VueHtmlShapeProperties } from './types'
import {
  DEFAULT_SHAPE_NAME,
  DEFAULT_VIEW_NAME,
  COMPAT_SHAPE_NAME,
} from './constants'

function getPrimerMarkup(primer?: Primer) {
  if (!primer) {
    return [
      {
        tagName: 'rect',
        selector: 'body',
      },
    ]
  }

  return [
    {
      tagName: primer,
      selector: 'body',
    },
  ]
}

function getPrimerAttrs(primer?: Primer) {
  switch (primer) {
    case 'circle':
      return {
        refCx: '50%',
        refCy: '50%',
        refR: '50%',
      }
    case 'ellipse':
      return {
        refCx: '50%',
        refCy: '50%',
        refRx: '50%',
        refRy: '50%',
      }
    default:
      return {
        refWidth: '100%',
        refHeight: '100%',
      }
  }
}

export interface RegisterNodeOptions {
  shape?: string
  compatibleShapeName?: boolean
  overwrite?: boolean
  primer?: Primer
}

export function registerVueHtmlShapeNode(options: RegisterNodeOptions = {}) {
  const shape = options.shape || DEFAULT_SHAPE_NAME
  const overwrite = options.overwrite ?? false

  const register = (shapeName: string) => {
    Graph.registerNode(
      shapeName,
      {
        view: DEFAULT_VIEW_NAME,
        markup: getPrimerMarkup(options.primer),
        attrs: {
          body: {
            fill: 'none',
            stroke: 'none',
            ...getPrimerAttrs(options.primer),
          },
        },
        propHooks(metadata: VueHtmlShapeProperties & NodeProperties) {
          if (metadata.markup == null) {
            const primer = metadata.primer || options.primer
            metadata.markup = getPrimerMarkup(primer)
            metadata.attrs = ObjectExt.merge(
              {},
              {
                body: {
                  fill: 'none',
                  stroke: 'none',
                  ...getPrimerAttrs(primer),
                },
              },
              metadata.attrs || {},
            )
          }
          return metadata
        },
      },
      overwrite,
    )
  }

  register(shape)

  if (options.compatibleShapeName && shape !== COMPAT_SHAPE_NAME) {
    register(COMPAT_SHAPE_NAME)
  }
}
```

说明：

1. 不再使用 `Markup.getForeignObjectMarkup()`。
2. 默认只保留一个透明 `rect`。
3. `primer` 只作为 SVG 背板或节点命中区域。
4. Vue 内容不进入 SVG。

---

## 6.6 Vue 挂载工具

文件：`src/utils/vue.ts`

```ts
import { createApp, h, type App, type Component } from 'vue'
import type { Graph, Node } from '@antv/x6'

export interface MountVueOptions {
  component: Component
  root: HTMLElement
  node: Node
  graph: Graph
  props?: Record<string, unknown>
}

export function mountVueComponent(options: MountVueOptions): App<Element> {
  const { component, root, node, graph, props } = options

  const app = createApp({
    name: 'X6VueHtmlShapeRoot',
    render() {
      return h(component, {
        node,
        graph,
        ...(props || {}),
      })
    },
    provide() {
      return {
        getNode: () => node,
        getGraph: () => graph,
      }
    },
  })

  app.mount(root)

  return app
}
```

Vue 2 兼容版可使用 `vue-demi`：

```ts
import { isVue2, isVue3, createApp, h, Vue2 } from 'vue-demi'
```

但如果当前团队全部 Vue 3，建议不要为了兼容 Vue 2 增加复杂度。可以发布两个包：

```txt
x6-vue-html-shape        // Vue 3 only
x6-vue-html-shape-demi   // Vue 2 / Vue 3
```

---

## 6.7 核心 NodeView

文件：`src/view.ts`

```ts
import { Dom, NodeView } from '@antv/x6'
import type { Graph, Node } from '@antv/x6'
import type { App, Component } from 'vue'
import { ensureVueHtmlLayer } from './layer'
import { getVueShapeComponent } from './registry'
import { mountVueComponent } from './utils/vue'
import {
  DEFAULT_VIEW_NAME,
  HTML_NODE_CLASS,
  HTML_NODE_CONTENT_CLASS,
} from './constants'
import type { VueHtmlShapeProperties } from './types'

export class VueHtmlShapeView extends NodeView {
  static action = 'vue-html' as any

  private app?: App<Element>
  private htmlRoot?: HTMLDivElement
  private contentRoot?: HTMLDivElement
  private mountedComponent?: Component

  confirmUpdate(flag: number) {
    const ret = super.confirmUpdate(flag)

    return this.handleAction(ret, VueHtmlShapeView.action, () => {
      this.renderVueComponent()
      this.updateHtmlPosition()
      this.updateHtmlVisible()
    })
  }

  protected getNodeProperties(): VueHtmlShapeProperties {
    return this.cell.getProp() as VueHtmlShapeProperties
  }

  protected getComponent(): Component | undefined {
    const node = this.cell as Node
    const props = this.getNodeProperties()

    return props.component || getVueShapeComponent(node.shape)
  }

  protected ensureHtmlRoot() {
    if (this.htmlRoot && this.contentRoot) {
      return {
        htmlRoot: this.htmlRoot,
        contentRoot: this.contentRoot,
      }
    }

    const props = this.getNodeProperties()
    const graph = this.graph as Graph
    const layer = props.getContainer
      ? props.getContainer(graph, this.cell as Node)
      : ensureVueHtmlLayer(graph)

    const htmlRoot = document.createElement('div')
    htmlRoot.className = HTML_NODE_CLASS
    htmlRoot.dataset.x6NodeId = String(this.cell.id)

    if (props.htmlClassName) {
      htmlRoot.classList.add(...props.htmlClassName.split(' ').filter(Boolean))
    }

    if (props.htmlStyle) {
      Object.assign(htmlRoot.style, props.htmlStyle)
    }

    const contentRoot = document.createElement('div')
    contentRoot.className = HTML_NODE_CONTENT_CLASS
    htmlRoot.appendChild(contentRoot)
    layer.appendChild(htmlRoot)

    this.htmlRoot = htmlRoot
    this.contentRoot = contentRoot

    return {
      htmlRoot,
      contentRoot,
    }
  }

  protected renderVueComponent() {
    const component = this.getComponent()
    if (!component) return

    const props = this.getNodeProperties()
    const { contentRoot } = this.ensureHtmlRoot()

    const shouldRemount =
      !this.app ||
      this.mountedComponent !== component ||
      props.keepAliveOnUpdate === false

    if (shouldRemount) {
      this.unmountVueComponent()

      const roots = this.ensureHtmlRoot()

      this.app = mountVueComponent({
        component,
        root: roots.contentRoot,
        node: this.cell as Node,
        graph: this.graph as Graph,
        props: props.props,
      })
      this.mountedComponent = component
    }
  }

  updateHtmlPosition() {
    if (!this.htmlRoot) return

    const node = this.cell as Node
    const props = this.getNodeProperties()
    const bbox = node.getBBox()
    const zoom = this.graph.zoom()
    const translate = this.graph.translate()

    this.htmlRoot.style.width = `${bbox.width}px`
    this.htmlRoot.style.height = `${bbox.height}px`

    if (props.scaleContent === false) {
      this.htmlRoot.style.transform = `translate(${bbox.x * zoom + translate.tx}px, ${bbox.y * zoom + translate.ty}px)`
      this.htmlRoot.style.width = `${bbox.width * zoom}px`
      this.htmlRoot.style.height = `${bbox.height * zoom}px`
    } else {
      this.htmlRoot.style.transform = `translate(${translate.tx}px, ${translate.ty}px) scale(${zoom}) translate(${bbox.x}px, ${bbox.y}px)`
    }

    this.htmlRoot.style.transformOrigin = '0 0'
  }

  updateHtmlVisible() {
    if (!this.htmlRoot) return

    const props = this.getNodeProperties()
    const visible = (this.cell as Node).isVisible()

    if (props.syncVisible !== false) {
      this.htmlRoot.classList.toggle('is-hidden', !visible)
    }

    this.htmlRoot.classList.toggle(
      'is-non-interactive',
      props.interactive === false,
    )
  }

  protected unmountVueComponent() {
    if (this.app) {
      this.app.unmount()
      this.app = undefined
      this.mountedComponent = undefined
    }

    if (this.contentRoot) {
      this.contentRoot.innerHTML = ''
    }
  }

  protected removeHtmlRoot() {
    this.unmountVueComponent()
    this.htmlRoot?.remove()
    this.htmlRoot = undefined
    this.contentRoot = undefined
  }

  onMouseDown(e: Dom.MouseDownEvent, x: number, y: number) {
    const target = e.target as Element
    const tagName = target.tagName.toLowerCase()

    if (isEditableTarget(target, tagName)) {
      return
    }

    super.onMouseDown(e, x, y)
  }

  unmount() {
    this.removeHtmlRoot()
    super.unmount()
    return this
  }
}

function isEditableTarget(target: Element, tagName: string) {
  if (tagName === 'textarea' || tagName === 'select') return true

  if (target instanceof HTMLElement && target.isContentEditable) return true

  if (tagName === 'input') {
    const type = target.getAttribute('type')
    return (
      type == null ||
      ['text', 'password', 'number', 'email', 'search', 'tel', 'url'].includes(
        type,
      )
    )
  }

  return false
}

VueHtmlShapeView.config({
  bootstrap: [VueHtmlShapeView.action],
  actions: {
    component: VueHtmlShapeView.action,
    data: VueHtmlShapeView.action,
    position: VueHtmlShapeView.action,
    size: VueHtmlShapeView.action,
    visible: VueHtmlShapeView.action,
  },
})

NodeView.registry.register(DEFAULT_VIEW_NAME, VueHtmlShapeView, true)
```

注意：

1. `NodeView.confirmUpdate` 的具体行为与 X6 版本有关，实际实现时需要基于当前 X6 3.x 类型调整。
2. 如果 `actions` 对 `data` 不生效，可以通过 Graph 事件单独同步。
3. `component` 变更应重新 mount。
4. `data` 变更时，如果组件内部直接读取 `node.getData()`，可能不是 Vue 响应式，需要额外方案。

---

## 6.8 位置同步

文件：`src/sync.ts`

```ts
import type { Graph, Node } from '@antv/x6'

export interface SyncOptions {
  throttle?: number
}

export function setupVueHtmlShapeSync(graph: Graph, options: SyncOptions = {}) {
  let raf = 0

  const updateNode = (node: Node) => {
    const view = graph.findViewByCell(node) as any
    view?.updateHtmlPosition?.()
    view?.updateHtmlVisible?.()
  }

  const updateAll = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      graph.getNodes().forEach(updateNode)
    })
  }

  const updateOne = ({ node }: { node: Node }) => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => updateNode(node))
  }

  graph.on('scale', updateAll)
  graph.on('translate', updateAll)
  graph.on('resize', updateAll)
  graph.on('node:moving', updateOne)
  graph.on('node:moved', updateOne)
  graph.on('node:change:position', updateOne)
  graph.on('node:change:size', updateOne)
  graph.on('node:change:visible', updateOne)
  graph.on('node:change:zIndex', updateAll)
  graph.on('cell:removed', updateAll)

  return () => {
    cancelAnimationFrame(raf)
    graph.off('scale', updateAll)
    graph.off('translate', updateAll)
    graph.off('resize', updateAll)
    graph.off('node:moving', updateOne)
    graph.off('node:moved', updateOne)
    graph.off('node:change:position', updateOne)
    graph.off('node:change:size', updateOne)
    graph.off('node:change:visible', updateOne)
    graph.off('node:change:zIndex', updateAll)
    graph.off('cell:removed', updateAll)
  }
}
```

### 6.8.1 是否需要同步 zIndex？

HTML 节点层与 SVG 节点层分离，zIndex 会比较棘手。

建议实现：

```ts
function syncZIndex(node: Node, htmlRoot: HTMLElement) {
  const zIndex = node.getZIndex?.() ?? 0
  htmlRoot.style.zIndex = String(zIndex)
}
```

但是要明确：

1. HTML 节点之间可以按 zIndex 排序。
2. HTML 节点整体通常仍然在 SVG 边、SVG 节点上方。
3. 如果需要“边盖住 HTML 节点”，新方案天然不适合。

---

## 6.9 事件处理

文件：`src/events.ts`

```ts
export function shouldStopGraphMouseDown(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toLowerCase()

  if (target.isContentEditable) return true

  if (['input', 'textarea', 'select', 'button', 'a'].includes(tagName)) {
    return true
  }

  if (target.closest('[data-x6-vue-stop]')) {
    return true
  }

  return false
}
```

在 Vue 组件中可使用：

```vue
<template>
  <div class="node-card">
    <input
      data-x6-vue-stop
      v-model="name"
    />
    <button
      data-x6-vue-stop
      @click="handleClick"
    >
      编辑
    </button>
  </div>
</template>
```

也可以在 HTML Layer 上统一捕获：

```ts
layer.addEventListener('mousedown', event => {
  if (shouldStopGraphMouseDown(event.target)) {
    event.stopPropagation()
  }
})
```

但注意：

1. 全局 stopPropagation 可能影响节点拖拽。
2. 推荐只对可交互元素阻止。
3. 节点本体拖拽仍交给 X6 SVG 节点处理。

---

## 6.10 插件安装入口

文件：`src/install.ts`

```ts
import type { App } from 'vue'
import type { VueHtmlShapePluginOptions } from './types'
import { registerVueHtmlShapeNode } from './node'
import { injectStyle } from './utils/dom'

export function install(app: App, options: VueHtmlShapePluginOptions = {}) {
  if (options.injectStyle !== false) {
    injectStyle()
  }

  registerVueHtmlShapeNode({
    shape: options.shape,
    compatibleShapeName: options.compatibleShapeName,
    overwrite: options.overwrite,
    primer: options.primer,
  })
}
```

文件：`src/index.ts`

```ts
export * from './types'
export * from './node'
export * from './view'
export * from './registry'
export * from './layer'
export * from './sync'
export * from './install'

export { install as default } from './install'
```

---

## 7. 使用方式设计

## 7.1 新用法

```ts
import { Graph } from '@antv/x6'
import {
  registerVueHtmlShapeNode,
  registerVueShapeComponent,
  setupVueHtmlShapeSync,
} from 'x6-vue-html-shape'
import 'x6-vue-html-shape/style.css'
import UserNode from './UserNode.vue'

registerVueHtmlShapeNode()
registerVueShapeComponent('user-node', UserNode)

const graph = new Graph({
  container: document.getElementById('container')!,
  grid: true,
})

setupVueHtmlShapeSync(graph)

graph.addNode({
  shape: 'user-node',
  x: 100,
  y: 100,
  width: 220,
  height: 80,
  data: {
    name: '张三',
    role: '管理员',
  },
})
```

如果 `user-node` 没有注册为 X6 shape，需要注册时将 shape 名字也注册进去：

```ts
registerVueHtmlShapeNode({
  shape: 'user-node',
})
```

也可以提供高级 API：

```ts
registerVueHtmlNode({
  shape: 'user-node',
  component: UserNode,
})
```

实现：

```ts
export function registerVueHtmlNode(options: {
  shape: string
  component: Component
  primer?: Primer
  overwrite?: boolean
}) {
  registerVueShapeComponent(options.shape, options.component)
  registerVueHtmlShapeNode({
    shape: options.shape,
    primer: options.primer,
    overwrite: options.overwrite,
  })
}
```

---

## 7.2 兼容官方用法

官方用法通常是：

```ts
import '@antv/x6-vue-shape'

graph.addNode({
  shape: 'vue-shape',
  x: 32,
  y: 48,
  width: 180,
  height: 40,
  component: MyComponent,
})
```

新包兼容模式：

```ts
import {
  registerVueHtmlShapeNode,
  setupVueHtmlShapeSync,
} from 'x6-vue-html-shape'
import 'x6-vue-html-shape/style.css'

registerVueHtmlShapeNode({
  compatibleShapeName: true,
  overwrite: true,
})

setupVueHtmlShapeSync(graph)

graph.addNode({
  shape: 'vue-shape',
  x: 32,
  y: 48,
  width: 180,
  height: 40,
  component: MyComponent,
})
```

### 7.2.1 迁移前

```ts
import '@antv/x6-vue-shape'
```

### 7.2.2 迁移后

```ts
import {
  registerVueHtmlShapeNode,
  setupVueHtmlShapeSync,
} from 'x6-vue-html-shape'
import 'x6-vue-html-shape/style.css'

registerVueHtmlShapeNode({
  compatibleShapeName: true,
  overwrite: true,
})

setupVueHtmlShapeSync(graph)
```

### 7.2.3 节点代码尽量不变

```ts
graph.addNode({
  shape: 'vue-shape',
  x: 100,
  y: 100,
  width: 240,
  height: 100,
  component: UserNode,
  data: {
    name: '张三',
  },
})
```

---

## 8. Vue 组件写法

文件：`UserNode.vue`

```vue
<script setup lang="ts">
import type { Graph, Node } from '@antv/x6'
import { computed } from 'vue'

const props = defineProps<{
  node: Node
  graph: Graph
}>()

const data = computed(
  () =>
    props.node.getData() as {
      name?: string
      role?: string
    },
)

function selectNode() {
  props.graph.select(props.node)
}
</script>

<template>
  <div class="user-node">
    <div class="user-node__title">{{ data.name }}</div>
    <div class="user-node__desc">{{ data.role }}</div>
    <button
      data-x6-vue-stop
      @click="selectNode"
    >
      选中
    </button>
  </div>
</template>

<style scoped>
.user-node {
  width: 100%;
  height: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  padding: 8px 12px;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
}

.user-node__title {
  font-weight: 600;
}

.user-node__desc {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
```

---

## 9. 响应式数据刷新方案

### 9.1 问题

如果组件中直接：

```ts
const data = computed(() => props.node.getData())
```

当 X6 节点 data 变化时，Vue 不一定自动刷新，因为 `node` 不是 Vue 响应式对象。

### 9.2 方案 A：组件内部监听 X6 事件

```ts
import { onBeforeUnmount, shallowRef } from 'vue'

const nodeData = shallowRef(props.node.getData())

const update = () => {
  nodeData.value = props.node.getData()
}

props.node.on('change:data', update)

onBeforeUnmount(() => {
  props.node.off('change:data', update)
})
```

### 9.3 方案 B：包内提供组合式函数

文件：`src/useNodeData.ts`

```ts
import type { Node } from '@antv/x6'
import { onBeforeUnmount, shallowRef } from 'vue'

export function useX6NodeData<T = any>(node: Node) {
  const data = shallowRef<T>(node.getData<T>())

  const update = () => {
    data.value = node.getData<T>()
  }

  node.on('change:data', update)

  onBeforeUnmount(() => {
    node.off('change:data', update)
  })

  return data
}
```

使用：

```ts
const data = useX6NodeData<UserNodeData>(props.node)
```

### 9.4 方案 C：包内每次 data 变化 remount

不推荐。

缺点：

1. 输入框焦点会丢失。
2. 内部状态会丢失。
3. 性能差。

建议：**不 remount，只让组件通过组合式函数响应 data。**

---

## 10. package.json 设计

### 10.1 Vue 3 only 版本

```json
{
  "name": "x6-vue-html-shape",
  "version": "0.1.0",
  "description": "X6 Vue shape without SVG foreignObject, rendering Vue nodes in an HTML overlay layer.",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./style.css": "./dist/style.css",
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": ["*.css", "./dist/style.css"],
  "keywords": [
    "antv",
    "x6",
    "vue",
    "shape",
    "html",
    "node",
    "graph",
    "safari",
    "foreignObject"
  ],
  "author": "ntnyq",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/ntnyq/x6-extension-vue-shape.git"
  },
  "bugs": {
    "url": "https://github.com/ntnyq/x6-extension-vue-shape/issues"
  },
  "homepage": "https://github.com/ntnyq/x6-extension-vue-shape#readme",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "run-s clean typecheck test:unit build:lib",
    "build:lib": "tsup src/index.ts --format esm,cjs --dts --clean --sourcemap",
    "clean": "rimraf dist coverage playwright-report test-results",
    "typecheck": "vue-tsc --noEmit",
    "lint": "eslint .",
    "test": "run-s test:unit test:e2e",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "prepublishOnly": "pnpm build"
  },
  "peerDependencies": {
    "@antv/x6": "^3.0.0",
    "vue": "^3.3.0 || ^3.4.0 || ^3.5.0"
  },
  "devDependencies": {
    "@antv/x6": "^3.1.7",
    "@playwright/test": "^1.52.0",
    "@types/node": "^22.0.0",
    "@vitejs/plugin-vue": "^5.2.0",
    "@vue/test-utils": "^2.4.6",
    "eslint": "^9.0.0",
    "jsdom": "^25.0.0",
    "npm-run-all2": "^6.2.0",
    "rimraf": "^6.0.0",
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0",
    "vue": "^3.5.0",
    "vue-tsc": "^2.1.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

### 10.2 Vue 2 / Vue 3 兼容版本

如果要兼容官方包能力，可以改成：

```json
{
  "dependencies": {
    "vue-demi": "latest"
  },
  "peerDependencies": {
    "@antv/x6": "^3.0.0",
    "@vue/composition-api": "^1.0.0-rc.1",
    "vue": "^2.7.0 || >=3.0.0"
  },
  "peerDependenciesMeta": {
    "@vue/composition-api": {
      "optional": true
    }
  }
}
```

但建议：

```txt
如果你的业务项目已经是 Vue 3，不要优先兼容 Vue 2。
```

原因：

1. Vue 2 生命周期与 app mount/unmount 差异较大。
2. `vue-demi` 增加调试成本。
3. 官方 `@antv/x6-vue-shape` 已经覆盖 Vue 2 历史项目。
4. 新包核心价值是规避 Safari foreignObject，而不是继续承担多 Vue 版本兼容包职责。

---

## 11. 构建配置

### 11.1 tsup.config.ts

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  external: ['vue', '@antv/x6'],
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    }
  },
})
```

### 11.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "test", "examples"],
  "exclude": ["dist", "node_modules"]
}
```

### 11.3 vite.config.ts

```ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
})
```

### 11.4 vitest.config.ts

```ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      reporter: ['text', 'html'],
    },
  },
})
```

### 11.5 playwright.config.ts

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
})
```

---

## 12. README 设计

文件：`README.md`

````md
# x6-vue-html-shape

Render Vue components as X6 nodes without SVG `foreignObject`.

## Why

`@antv/x6-vue-shape` renders Vue components inside SVG `foreignObject`. This can break in Safari / iOS Safari when node content uses CSS such as `position`, `transform`, `transition`, `will-change`, etc.

This package renders Vue components in an HTML overlay layer instead.

## Install

```bash
pnpm add x6-vue-html-shape @antv/x6 vue
```
````

## Usage

```ts
import { Graph } from '@antv/x6'
import { registerVueHtmlNode, setupVueHtmlShapeSync } from 'x6-vue-html-shape'
import 'x6-vue-html-shape/style.css'
import UserNode from './UserNode.vue'

registerVueHtmlNode({
  shape: 'user-node',
  component: UserNode,
})

const graph = new Graph({
  container: document.getElementById('container')!,
})

setupVueHtmlShapeSync(graph)

graph.addNode({
  shape: 'user-node',
  x: 100,
  y: 100,
  width: 220,
  height: 80,
  data: {
    name: 'x6',
  },
})
```

## Compatibility mode

```ts
import {
  registerVueHtmlShapeNode,
  setupVueHtmlShapeSync,
} from 'x6-vue-html-shape'
import 'x6-vue-html-shape/style.css'

registerVueHtmlShapeNode({
  compatibleShapeName: true,
  overwrite: true,
})

setupVueHtmlShapeSync(graph)
```

Then existing nodes can still use:

```ts
graph.addNode({
  shape: 'vue-shape',
  component: MyNode,
})
```

## Limitations

- HTML nodes are rendered above the SVG layer by default.
- Exporting graph images requires extra HTML + SVG composition.
- SVG ports and magnets should stay in the SVG node layer.
- Complex z-index ordering between SVG edges and HTML nodes is limited.

````

---

## 13. 测试计划

## 13.1 单元测试

### 13.1.1 registry.test.ts

测试点：

1. 注册组件。
2. 获取组件。
3. 覆盖组件。
4. 删除组件。
5. 清空注册表。

示例：

```ts
import { describe, expect, it } from 'vitest'
import {
  clearVueShapeComponents,
  getVueShapeComponent,
  registerVueShapeComponent,
} from '../../src/registry'

const Comp = { template: '<div />' }

describe('registry', () => {
  it('registers and gets component', () => {
    clearVueShapeComponents()
    registerVueShapeComponent('user-node', Comp)
    expect(getVueShapeComponent('user-node')).toBe(Comp)
  })
})
````

### 13.1.2 layer.test.ts

测试点：

1. 创建 layer。
2. 重复调用不重复创建。
3. graph container `position: static` 时设置为 `relative`。
4. remove layer。

### 13.1.3 sync.test.ts

测试点：

1. `scale` 后调用 `updateHtmlPosition`。
2. `translate` 后调用 `updateHtmlPosition`。
3. `node:change:position` 后只更新对应节点。
4. dispose 后不再触发。

### 13.1.4 events.test.ts

测试点：

1. input 返回 true。
2. textarea 返回 true。
3. select 返回 true。
4. button 返回 true。
5. 普通 div 返回 false。
6. `[data-x6-vue-stop]` 返回 true。

---

## 13.2 E2E 测试

使用 Playwright。

### 13.2.1 基础渲染

文件：`test/e2e/vue-html-shape.spec.ts`

测试点：

1. Graph 初始化。
2. 添加 Vue 节点。
3. 页面能看到节点文本。
4. `.x6-vue-html-layer` 存在。
5. `.x6-vue-html-node` 数量正确。
6. SVG 中不存在 `foreignObject`。

示例：

```ts
import { expect, test } from '@playwright/test'

test('render vue html shape without foreignObject', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('.x6-vue-html-layer')).toBeVisible()
  await expect(page.locator('.x6-vue-html-node')).toHaveCount(1)
  await expect(page.getByText('张三')).toBeVisible()

  const foreignObjectCount = await page.locator('foreignObject').count()
  expect(foreignObjectCount).toBe(0)
})
```

### 13.2.2 缩放与平移

测试点：

1. 记录 HTML 节点初始 bounding box。
2. 调用 `graph.zoom(1.5)`。
3. HTML 节点位置和尺寸随之变化。
4. 调用 `graph.translate(100, 50)`。
5. HTML 节点位置随之变化。

### 13.2.3 节点拖拽

测试点：

1. 拖拽 X6 节点。
2. HTML 节点跟随。
3. data 不丢失。

### 13.2.4 输入框交互

测试点：

1. Vue 节点中有 input。
2. 点击 input 能聚焦。
3. 输入文本正常。
4. 输入时不会触发节点拖拽。

### 13.2.5 Safari / WebKit

测试点：

1. 使用 Playwright `webkit`。
2. 节点内部包含：
   - `position: relative`
   - `transform`
   - `transition`
   - Element Plus 类似卡片结构
3. 节点不会跑到左上角。
4. 节点视觉位置与 X6 节点 bbox 接近。

---

## 14. 迁移策略

## 14.1 第一阶段：兼容导入

从：

```ts
import '@antv/x6-vue-shape'
```

改为：

```ts
import {
  registerVueHtmlShapeNode,
  setupVueHtmlShapeSync,
} from 'x6-vue-html-shape'
import 'x6-vue-html-shape/style.css'

registerVueHtmlShapeNode({
  compatibleShapeName: true,
  overwrite: true,
})
```

Graph 创建后：

```ts
const disposeVueHtmlShapeSync = setupVueHtmlShapeSync(graph)
```

组件卸载时：

```ts
disposeVueHtmlShapeSync()
graph.dispose()
```

## 14.2 第二阶段：统一 shape 命名

将：

```ts
shape: 'vue-shape'
```

逐步改成业务语义 shape：

```ts
shape: 'user-node'
shape: 'approval-node'
shape: 'org-node'
shape: 'form-node'
```

注册：

```ts
registerVueHtmlNode({
  shape: 'user-node',
  component: UserNode,
})
```

## 14.3 第三阶段：沉淀节点组件规范

约定：

1. 节点组件只负责展示和轻量交互。
2. 节点状态来自 `node.getData()`。
3. 修改节点数据使用：

```ts
node.setData(nextData, { deep: true })
```

4. 节点尺寸由 X6 的 `width` / `height` 控制。
5. Vue 组件内部使用 `width: 100%; height: 100%;`。
6. 复杂弹层建议 teleport 到 body。

---

## 15. 新实现的限制

### 15.1 HTML 层与 SVG 层的 zIndex 不完全统一

因为 Vue 内容已经不在 SVG 内，所以：

1. HTML 节点通常会盖在 SVG 边上方。
2. SVG 中的边无法自然盖住 HTML 节点。
3. SVG 工具层、选择框、框选层可能需要提高 z-index。

解决策略：

```css
.x6-widget-selection-box {
  z-index: 10;
}

.x6-vue-html-layer {
  z-index: 2;
}
```

或者将 HTML layer 插入到 X6 容器内部特定层级。

### 15.2 图片导出需要额外处理

官方 `foreignObject` 方案在某些情况下可以跟随 SVG 导出。新方案中 Vue 节点是 HTML，需要单独合成。

可选方案：

1. `html2canvas` 截取整个 graph container。
2. SVG 导出 + HTML 层截图合成。
3. 为每种 Vue 节点提供 SVG fallback。
4. 服务端 Puppeteer 截图。

生产建议：

```txt
如果导出图片是强需求，优先使用 Puppeteer 截图整个页面或图容器。
```

### 15.3 节点旋转支持复杂

如果 X6 节点使用 angle / rotate，需要同步 CSS transform：

```ts
const angle = node.getAngle()
htmlRoot.style.transform = `
  translate(${translate.tx}px, ${translate.ty}px)
  scale(${zoom})
  translate(${bbox.x}px, ${bbox.y}px)
  rotate(${angle}deg)
`
```

但旋转中心、连接桩、边路径可能要额外校准。

建议 MVP 不支持旋转，文档明确：

```txt
MVP only supports position / size / scale / translate. Rotation support is experimental.
```

### 15.4 大量节点性能

HTML + Vue 节点数量过多时性能会下降。

建议：

| 节点数量   | 建议                                           |
| ---------- | ---------------------------------------------- |
| 0 - 200    | 可以使用 Vue HTML 节点                         |
| 200 - 1000 | 谨慎使用，避免复杂组件                         |
| 1000+      | 不建议全部 Vue 渲染，考虑虚拟化 / SVG 简化节点 |

优化方向：

1. 视口裁剪：只渲染可见区域节点。
2. 节点组件 KeepAlive 池化。
3. 批量 requestAnimationFrame 同步。
4. 简化节点 DOM。
5. 缩放过小时切换为简化 SVG 节点。

### 15.5 端口和 magnet 不应放在 Vue HTML 内

X6 连线依赖 SVG magnet / port。

建议：

1. ports 仍使用 X6 原生 ports。
2. Vue 组件中只展示视觉内容。
3. 如果需要自定义端口样式，通过 X6 port markup / attrs 实现。
4. 不建议用 HTML button 当连线 magnet。

### 15.6 框选和节点拖拽命中区域

因为 Vue HTML 节点盖在 SVG 节点上方，可能影响：

1. 点击选中。
2. 拖拽移动。
3. 框选。
4. 画布平移。

解决策略：

1. `.x6-vue-html-layer { pointer-events: none; }`
2. `.x6-vue-html-node { pointer-events: auto; }`
3. 节点组件非交互区域可以设置：

```css
.node-content-pass-through {
  pointer-events: none;
}
```

4. 交互元素设置：

```html
<button data-x6-vue-stop>编辑</button>
```

---

## 16. MVP 实施步骤

### Step 1：初始化包

```bash
mkdir x6-vue-html-shape
cd x6-vue-html-shape
pnpm init
pnpm add -D typescript tsup vite vitest vue-tsc @vitejs/plugin-vue @playwright/test eslint rimraf npm-run-all2
pnpm add -D @antv/x6 vue
```

### Step 2：创建基础文件

```txt
src/constants.ts
src/types.ts
src/registry.ts
src/layer.ts
src/style.css
src/node.ts
src/view.ts
src/sync.ts
src/install.ts
src/index.ts
```

### Step 3：先跑通最小 Demo

目标：

1. Graph 初始化。
2. 注册 `vue-html-shape`。
3. 添加一个节点。
4. Vue 组件显示在正确位置。
5. 缩放、平移、拖拽都跟随。
6. DOM 中不存在 `foreignObject`。

### Step 4：做兼容模式

支持：

```ts
registerVueHtmlShapeNode({
  compatibleShapeName: true,
  overwrite: true,
})
```

然后原来的：

```ts
shape: 'vue-shape'
component: MyNode
```

继续工作。

### Step 5：完善交互

1. input 聚焦。
2. button 点击。
3. select 下拉。
4. contenteditable。
5. 节点拖拽不冲突。

### Step 6：完善测试

1. Vitest 单测。
2. Playwright Chromium。
3. Playwright Firefox。
4. Playwright WebKit。
5. 手动 Safari 真机测试。

### Step 7：编写迁移文档

重点写清楚：

1. 为什么不用 `foreignObject`。
2. 哪些能力可以无缝迁移。
3. 哪些能力不能完全一致。
4. 导出图片、zIndex、ports 的限制。

### Step 8：发布 alpha

```bash
pnpm build
npm publish --tag alpha
```

### Step 9：项目内灰度

先替换一个图谱页面：

1. 简单节点。
2. 表单节点。
3. 带 Element Plus 组件的节点。
4. Safari 验证。
5. iOS Safari 验证。

---

## 17. 推荐版本路线图

### v0.1.0

目标：MVP。

功能：

1. Vue 3 渲染。
2. HTML Overlay Layer。
3. 注册 `vue-html-shape`。
4. 兼容 `vue-shape`。
5. scale / translate / position / size 同步。
6. 基础样式。
7. WebKit E2E 测试。

### v0.2.0

目标：迁移增强。

功能：

1. `registerVueHtmlNode` 高级 API。
2. `useX6NodeData`。
3. 事件阻止工具。
4. 节点可见性同步。
5. zIndex 同步。
6. 文档完善。

### v0.3.0

目标：生产可用。

功能：

1. 视口裁剪。
2. 大量节点性能优化。
3. 自定义 HTML layer container。
4. 旋转实验支持。
5. examples 完善。

### v1.0.0

目标：稳定。

要求：

1. 在真实项目至少 2 - 4 周稳定使用。
2. 覆盖 Chrome / Firefox / Safari / iOS Safari。
3. 明确不支持项。
4. API 稳定。
5. 完整迁移文档。

---

## 18. 与官方包差异总结

新包不是简单 fork 官方包，而是换了渲染架构。

| 项目           | 官方包                  | 新包               |
| -------------- | ----------------------- | ------------------ |
| 渲染位置       | SVG `foreignObject`     | HTML Overlay Layer |
| Safari 兼容    | 存在风险                | 规避核心风险       |
| Vue 组件复杂度 | 受 `foreignObject` 限制 | 接近普通 HTML      |
| 导出 SVG       | 相对容易                | 需要额外处理       |
| ports          | 可与内容同层            | 建议留在 SVG 层    |
| zIndex         | SVG 内统一              | HTML / SVG 分层    |
| 迁移成本       | 已有生态                | 需替换注册逻辑     |

---

## 19. 最终建议

如果你的节点组件只是简单展示，且必须依赖 SVG 导出，那么继续使用纯 SVG 节点可能更稳。

如果你的节点组件包含：

1. Element Plus 组件。
2. 表单控件。
3. Popover / Tooltip。
4. CSS transform / transition。
5. 复杂布局。
6. Safari / iOS Safari 兼容要求。

那么建议使用本方案：

```txt
X6 SVG 节点负责图编辑能力
Vue HTML Overlay 负责复杂节点 UI
```

这个架构能最大程度避开 `foreignObject` 的坑，同时保留 X6 的图编辑能力。

---

## 20. 参考资料

1. `@antv/x6-vue-shape` npm 包：`https://www.npmjs.com/package/@antv/x6-vue-shape`
2. `@antv/x6-vue-shape` 源码：`https://github.com/antvis/x6-extensions/tree/master/packages/x6-vue-shape`
3. WebKit bug 23113：`https://bugs.webkit.org/show_bug.cgi?id=23113`
4. react-d3-tree issue 284：`https://github.com/bkrem/react-d3-tree/issues/284`
5. AntV X6：`https://github.com/antvis/X6`
