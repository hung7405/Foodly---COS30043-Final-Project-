<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.store'
import { computed } from 'vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const tabs = computed(() => [
  { id: 'home', label: 'Home', icon: 'home', path: '/' },
  { id: 'explore', label: 'Explore', icon: 'explore', path: '/explore' },
  { id: 'orders', label: 'Orders', icon: 'orders', path: auth.isAuthenticated ? '/profile/reservations' : '/login' },
  { id: 'account', label: 'Me', icon: 'profile', path: auth.isAuthenticated ? '/profile' : '/login' },
])

const activeTab = computed(() => {
  const path = route.path
  if (path === '/') return 'home'
  if (path.startsWith('/explore')) return 'explore'
  if (path.startsWith('/profile/reservations') || path.startsWith('/payments/')) return 'orders'
  if (path.startsWith('/profile') || path.startsWith('/login') || path.startsWith('/register')) return 'account'
  return ''
})

const visible = computed(() => {
  const hidden = ['/login', '/register', '/admin', '/dashboard', '/deals/new', '/deals/', '/payments/']
  const hiddenExact = ['/login', '/register']
  if (hiddenExact.includes(route.path)) return true
  if (hidden.some((r) => route.path.startsWith(r) && r.length > 1 && route.path !== '/deals/')) return false
  return true
})

function go(path: string) {
  router.push(path)
}
</script>

<template>
  <nav v-if="visible" class="bottom-tab-bar">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="tab-item"
      :class="{ active: activeTab === tab.id, 'tab-home': tab.id === 'home' }"
      :aria-current="activeTab === tab.id ? 'page' : undefined"
      @click="go(tab.path)"
    >
      <svg
        class="tab-icon"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <template v-if="tab.icon === 'home'">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </template>
        <template v-else-if="tab.icon === 'explore'">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </template>
        <template v-else-if="tab.icon === 'orders'">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </template>
        <template v-else-if="tab.icon === 'profile'">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </template>
      </svg>
      <span class="tab-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--color-bottom-nav-bg);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 -1px 8px rgba(0, 0, 0, 0.06);
}
.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  height: 100%;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-bottom-nav-inactive);
  transition: color var(--transition-fast);
  padding: 0;
  position: relative;
}
.tab-item.active {
  color: var(--color-bottom-nav-active);
}
.tab-icon {
  flex-shrink: 0;
  transition: transform var(--transition-fast);
}
.tab-item:active .tab-icon {
  transform: scale(0.9);
}
.tab-label {
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.01em;
}
@media (min-width: 768px) {
  .bottom-tab-bar {
    display: none;
  }
}
</style>
