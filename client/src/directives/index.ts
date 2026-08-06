import type { Directive } from 'vue'

export const vClickOutside: Directive<HTMLElement, (event: Event) => void> = {
  mounted(el, binding) {
    const handler = (event: Event) => {
      const target = event.target as Node | null
      if (!target) return
      if (!el.contains(target)) binding.value(event)
    }
    ;(el as any)._clickOutsideHandler = handler
    document.addEventListener('click', handler)
  },
  unmounted(el) {
    const handler = (el as any)._clickOutsideHandler
    if (handler) document.removeEventListener('click', handler)
    delete (el as any)._clickOutsideHandler
  },
}

export const vFocus: Directive<HTMLElement> = {
  mounted(el) {
    el.focus()
  },
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function getFocusable(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (node) => node.offsetParent !== null || node === document.activeElement
  )
}

/**
 * v-focus-trap: constrain keyboard focus inside a dialog/modal while open.
 * Requires the bound element to render only when visible. Focus returns to the
 * previously focused element on unmount.
 */
export const vFocusTrap: Directive<HTMLElement> = {
  mounted(el) {
    ;(el as any)._focusTrapPrev = document.activeElement as HTMLElement
    const focusables = getFocusable(el)
    if (focusables.length) {
      const first = focusables[0]
      const onKeydown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return
        const inner = getFocusable(el)
        if (inner.length === 0) {
          e.preventDefault()
          return
        }
        const firstEl = inner[0]
        const lastEl = inner[inner.length - 1]
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault()
          lastEl.focus()
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
      ;(el as any)._focusTrapHandler = onKeydown
      el.addEventListener('keydown', onKeydown)
      // Move focus into the dialog so the trap is active immediately
      if (!el.contains(document.activeElement)) first.focus()
    }
  },
  unmounted(el) {
    const handler = (el as any)._focusTrapHandler
    if (handler) el.removeEventListener('keydown', handler)
    const prev = (el as any)._focusTrapPrev
    if (prev && prev.focus && typeof prev.focus === 'function') {
      // only restore if still connected to the document
      if (document.contains(prev)) prev.focus()
    }
    delete (el as any)._focusTrapHandler
    delete (el as any)._focusTrapPrev
  },
}
