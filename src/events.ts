const STOP_SELECTOR =
  'input, textarea, select, button, a, label, summary, [data-x6-vue-stop]'

/**
 * Decide whether graph drag/selection mouse down should be blocked.
 *
 * @param target - Mouse down event target.
 * @returns `true` when graph mouse handling should be stopped.
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
  if (!target || !('nodeType' in target) || target.nodeType !== 1) {
    return false
  }

  const targetElement = target as Element

  if (targetElement.closest(STOP_SELECTOR)) {
    return true
  }

  for (
    let element: Element | null = targetElement;
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
