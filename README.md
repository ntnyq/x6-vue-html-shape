# x6-vue-html-shape

[![CI](https://github.com/ntnyq/x6-vue-html-shape/workflows/CI/badge.svg)](https://github.com/ntnyq/x6-vue-html-shape/actions)
[![NPM VERSION](https://img.shields.io/npm/v/x6-vue-html-shape.svg)](https://www.npmjs.com/package/x6-vue-html-shape)
[![NPM DOWNLOADS](https://img.shields.io/npm/dy/x6-vue-html-shape.svg)](https://www.npmjs.com/package/x6-vue-html-shape)
[![LICENSE](https://img.shields.io/github/license/ntnyq/x6-vue-html-shape.svg)](https://github.com/ntnyq/x6-vue-html-shape/blob/main/LICENSE)

Render Vue components as X6 nodes in an HTML overlay without SVG `foreignObject`.

[Documentation](https://x6-vue-html-shape.ntnyq.dev/) | [Getting Started](https://x6-vue-html-shape.ntnyq.dev/guide/getting-started) | [Playground](https://x6-vue-html-shape.ntnyq.dev/playground)

## Why

`@antv/x6-vue-shape` mounts Vue inside SVG `foreignObject`, a rendering path with
reported Safari/WebKit positioning issues for complex HTML/CSS. This package
avoids that path; specific Safari/iOS versions still need application-level testing.

This package renders Vue nodes into an HTML overlay layer while keeping X6 in charge of graph editing behaviors.

## Installation

Requires Vue `^3.3.0` and X6 `^3.0.1`.

```sh
pnpm add x6-vue-html-shape @antv/x6 vue
```

## License

[MIT](./LICENSE) © 2026-PRESENT ntnyq
