<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.store'
import { useUiStore } from '../../stores/ui.store'
import { SITE_NAME } from '../../utils/constants'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const searchQuery = ref('')

function handleSearch() {
  const q = searchQuery.value.trim()
  if (q) {
    router.push('/explore?search=' + encodeURIComponent(q))
    searchQuery.value = ''
  }
}
</script>

<template>
  <nav class="navbar">
    <div class="navbar-inner">
      <router-link to="/" class="navbar-brand">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
          <path d="M8 22V10l8 6-8 6z" fill="white" />
          <path d="M16 22V10l8 6-8 6z" fill="white" opacity="0.6" />
        </svg>
        <span class="navbar-title">{{ SITE_NAME }}</span>
      </router-link>

      <div class="navbar-search" role="search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="searchQuery"
          class="search-input"
          type="search"
          aria-label="Search deals, stores"
          placeholder="Search deals, stores..."
          @keyup.enter="handleSearch"
        />
        <button
          type="button"
          class="ai-search-btn"
          title="AI vision search"
          :aria-label="'AI vision search'"
          @click="router.push('/ai-search')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
      </div>

      <div class="navbar-actions">
        <button
          class="theme-toggle"
          :title="ui.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          :aria-label="ui.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="ui.toggleTheme"
        >
          <svg
            v-if="ui.isDark"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <svg
            v-else
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
        <template v-if="auth.isAuthenticated">
          <router-link v-if="auth.isMerchant" to="/merchant" class="btn btn-ghost btn-sm merchant-link"
            >Merchant Hub</router-link
          >
          <router-link to="/profile" class="nav-avatar">{{
            auth.user?.username?.charAt(0).toUpperCase() || '?'
          }}</router-link>
        </template>
        <template v-else>
          <router-link to="/login" class="btn btn-ghost btn-sm">Sign In</router-link>
        </template>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--color-glass-bg);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-border);
}
.navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  gap: 12px;
  padding: 0 16px;
  max-width: 1200px;
  margin: 0 auto;
}
.navbar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--color-text);
  font-weight: 700;
  font-size: 1.05rem;
  flex-shrink: 0;
}
.navbar-title {
  letter-spacing: -0.02em;
}
.navbar-search {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  max-width: 360px;
  padding: 0 14px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
}
.navbar-search:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(238, 77, 45, 0.08);
  background: var(--color-bg);
}
.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font-family);
  font-size: 0.8125rem;
  color: var(--color-text);
  outline: none;
  min-width: 0;
}
.search-input::placeholder {
  color: var(--color-text-tertiary);
}
.ai-search-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-accent);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.ai-search-btn:hover {
  background: var(--color-accent-light);
}
.navbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.theme-toggle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}
.theme-toggle:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}
.merchant-link {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.nav-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-accent-light);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8125rem;
  text-decoration: none;
}
@media (max-width: 640px) {
  .navbar-search {
    max-width: 180px;
  }
}
</style>
