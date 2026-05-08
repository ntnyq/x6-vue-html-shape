import { STYLE_ID } from '../constants'

/**
 * Replace caller-owned wrapper styles, including removed custom properties.
 * @param {HTMLElement} root - Node wrapper.
 * @param {Record<string, string>} previous - Previously applied styles.
 * @param {Record<string, string>} current - Replacement styles.
 */
export function updateHtmlStyle(
  root: HTMLElement,
  previous: Record<string, string>,
  current: Record<string, string>,
) {
  for (const [key, value] of Object.entries({
    ...Object.fromEntries(
      Object.keys(previous).map(property => [property, '']),
    ),
    ...current,
  })) {
    if (key.startsWith('--') || key.includes('-')) {
      root.style.setProperty(key, value)
    } else {
      Object.assign(root.style, { [key]: value })
    }
  }
}

const STYLE_TEXT = `
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
  contain: layout style;
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
`

/**
 * Inject built-in CSS styles once into `document.head`.
 *
 * Internal helper. Consumers can import `x6-vue-html-shape/style.css` or
 * enable style injection through the public Vue plugin.
 */
export function injectStyle() {
  if (typeof document === 'undefined') {
    return
  }

  if (document.querySelector(`#${STYLE_ID}`)) {
    return
  }

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = STYLE_TEXT
  document.head.append(style)
}
