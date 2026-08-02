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
