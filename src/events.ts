const STOP_SELECTOR = 'input, textarea, select, button, a, [data-x6-vue-stop]'

/**
 * Decide whether graph drag/selection mouse down should be blocked.
 *
 * @param {EventTarget | null} target - Mouse down event target.
 * @returns {boolean} `true` when graph mouse handling should be stopped.
 *
 * @example
 * ```ts
 * import { shouldStopGraphMouseDown } from 'x6-vue-html-shape'
 *
 * const stop = shouldStopGraphMouseDown(event.target)
 * if (stop) {
 *   return
 * }
 * ```
 */
export function shouldStopGraphMouseDown(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false
  }

  if (target.closest(STOP_SELECTOR)) {
    return true
  }

  for (
    let element: Element | null = target;
    element;
    element = element.parentElement
  ) {
    const editable = element.getAttribute('contenteditable')?.toLowerCase()
    if (editable === 'false') {
      return false
    }
    if (
      editable === '' ||
      editable === 'true' ||
      editable === 'plaintext-only'
    ) {
      return true
    }
  }

  return false
}
