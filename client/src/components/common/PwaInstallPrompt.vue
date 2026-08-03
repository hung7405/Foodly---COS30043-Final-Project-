<script setup lang="ts">
import { ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const showPrompt = ref(false)
const isInstalling = ref(false)
let deferredPrompt: BeforeInstallPromptEvent | null = null

const dismissedKey = 'foodly-pwa-install-dismissed'

window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault()
  if (sessionStorage.getItem(dismissedKey)) return
  deferredPrompt = e as BeforeInstallPromptEvent
  showPrompt.value = true
})

window.addEventListener('appinstalled', () => {
  showPrompt.value = false
  deferredPrompt = null
})

async function install() {
  if (!deferredPrompt) return
  isInstalling.value = true
  try {
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') showPrompt.value = false
  } finally {
    isInstalling.value = false
    deferredPrompt = null
  }
}

function dismiss() {
  sessionStorage.setItem(dismissedKey, '1')
  showPrompt.value = false
}
</script>

<template>
  <Transition name="install-slide">
    <div v-if="showPrompt" class="pwa-install-banner" role="dialog" aria-label="Install Foodly">
      <div class="pwa-install-info">
        <img src="/pwa/icon-192.png" alt="Foodly" class="pwa-install-icon" width="40" height="40" />
        <div class="pwa-install-text">
          <strong>Install Foodly</strong>
          <span>Get the app with offline support &amp; home screen access.</span>
        </div>
      </div>
      <div class="pwa-install-actions">
        <button class="btn btn-ghost" @click="dismiss">Not now</button>
        <button class="btn btn-primary" :disabled="isInstalling" @click="install">
          {{ isInstalling ? 'Installing...' : 'Install' }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.pwa-install-banner {
  position: fixed;
  bottom: calc(1rem + var(--bottom-nav-height));
  left: 1rem;
  right: 1rem;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  max-width: 420px;
  margin: 0 auto;
}
.pwa-install-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.pwa-install-icon {
  border-radius: 10px;
  flex-shrink: 0;
}
.pwa-install-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.pwa-install-text strong {
  font-size: 0.92rem;
}
.pwa-install-text span {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pwa-install-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.install-slide-enter-active,
.install-slide-leave-active {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}
.install-slide-enter-from,
.install-slide-leave-to {
  transform: translateY(120%);
  opacity: 0;
}

@media (min-width: 768px) {
  .pwa-install-banner {
    bottom: 1rem;
  }
}
</style>
