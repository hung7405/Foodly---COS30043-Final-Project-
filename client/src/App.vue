<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNavBar from './components/common/AppNavBar.vue'
import AppFooter from './components/common/AppFooter.vue'
import BottomTabBar from './components/common/BottomTabBar.vue'
import ErrorBoundary from './components/common/ErrorBoundary.vue'
import PwaInstallPrompt from './components/common/PwaInstallPrompt.vue'
import SupportChat from './components/common/SupportChat.vue'
import { useUiStore } from './stores/ui.store'
import { useAuthStore } from './stores/auth.store'

const uiStore = useUiStore()
const authStore = useAuthStore()
const route = useRoute()

onMounted(() => {
  authStore.fetchProfile()
})

const showBottomTab = computed(() => {
  const hidden = ['/login', '/register', '/admin', '/dashboard', '/deals/new']
  return !hidden.some((r) => route.path === r)
})
</script>

<template>
  <div class="app-wrapper" :class="{ 'dark-mode': uiStore.isDark }">
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <AppNavBar />
    <main id="main-content" class="main-content" :class="{ 'has-bottom-tab': showBottomTab }">
      <ErrorBoundary>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </ErrorBoundary>
    </main>
    <AppFooter />
    <BottomTabBar />
    <PwaInstallPrompt />
    <SupportChat />

    <div class="toast-container" aria-live="polite">
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
  padding-top: 64px;
  padding-bottom: 0;
}

.main-content.has-bottom-tab {
  padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px));
}

.toast-container {
  position: fixed;
  bottom: calc(1rem + var(--bottom-nav-height));
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
  border-radius: var(--radius-sm);
  color: #fff;
  cursor: pointer;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 0.875rem;
}

.toast--error {
  background: var(--color-error);
}
.toast--success {
  background: var(--color-success);
}
.toast--info {
  background: var(--color-info);
}

@media (min-width: 768px) {
  .bottom-tab-bar {
    display: none;
  }
  .main-content.has-bottom-tab {
    padding-bottom: 0;
  }
  .toast-container {
    bottom: 1rem;
  }
}
</style>
