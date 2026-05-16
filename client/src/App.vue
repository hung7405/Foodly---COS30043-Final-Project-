<script setup lang="ts">
import { onMounted } from 'vue'
import AppNavBar from './components/common/AppNavBar.vue'
import AppFooter from './components/common/AppFooter.vue'
import ErrorBoundary from './components/common/ErrorBoundary.vue'
import { useUiStore } from './stores/ui.store'
import { useAuthStore } from './stores/auth.store'

const uiStore = useUiStore()
const authStore = useAuthStore()

onMounted(() => {
  authStore.fetchProfile()
})
</script>

<template>
  <div class="app-wrapper" :class="{ 'dark-mode': uiStore.isDark }">
    <AppNavBar />
    <main class="main-content">
      <ErrorBoundary>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </ErrorBoundary>
    </main>
    <AppFooter />

    <div class="toast-container">
      <transition-group name="toast">
        <div
          v-for="toast in uiStore.toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.type}`"
          @click="uiStore.removeToast(toast.id)"
        >
          {{ toast.message }}
        </div>
      </transition-group>
    </div>
  </div>
</template>

<style scoped>
.app-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg);
  transition: background-color var(--transition-base);
}

.main-content {
  flex: 1;
  padding-top: 72px;
}

.toast-container {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.toast--error { background: #dc2626; }
.toast--success { background: #16a34a; }
.toast--info { background: #2563eb; }
</style>
