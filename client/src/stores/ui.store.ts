import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'error' | 'success' | 'info'
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<'light' | 'dark'>((localStorage.getItem('theme') as 'light' | 'dark') || 'light')
  const isMobileNavOpen = ref(false)
  const toasts = ref<Toast[]>([])
  let toastId = 0

  const isDark = computed(() => theme.value === 'dark')

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', theme.value)
    applyTheme()
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme.value)
  }

  function addToast(message: string, type: Toast['type'] = 'error') {
    const id = ++toastId
    toasts.value.push({ id, message, type })
    setTimeout(() => removeToast(id), 5000)
  }

  function removeToast(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function toggleMobileNav() {
    isMobileNavOpen.value = !isMobileNavOpen.value
  }

  function closeMobileNav() {
    isMobileNavOpen.value = false
  }

  applyTheme()

  return {
    theme,
    isDark,
    isMobileNavOpen,
    toasts,
    toggleTheme,
    applyTheme,
    addToast,
    removeToast,
    toggleMobileNav,
    closeMobileNav,
  }
})
