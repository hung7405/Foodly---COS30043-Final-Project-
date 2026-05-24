<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '../../stores/ui.store'
import { useAuthStore } from '../../stores/auth.store'
import { SITE_NAME } from '../../utils/constants'

const uiStore = useUiStore()
const auth = useAuthStore()
const router = useRouter()

const searchQuery = ref('')

function handleSearch() {
  const q = searchQuery.value.trim()
  if (q) {
    router.push(`/explore?search=${encodeURIComponent(q)}`)
    searchQuery.value = ''
  }
}
</script>

<template>
  <nav class="navbar" role="navigation" aria-label="Main navigation">
    <div class="navbar-inner container">
      <router-link to="/" class="navbar-brand" aria-label="DealMap AI Home">
        <svg class="navbar-logo" width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="var(--color-accent)"/>
          <path d="M8 22V10l8 6-8 6z" fill="white"/>
          <path d="M16 22V10l8 6-8 6z" fill="white" opacity="0.6"/>
        </svg>
        <span class="navbar-title">{{ SITE_NAME }}</span>
      </router-link>

      <div class="navbar-search" role="search">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          v-model="searchQuery"
          class="search-input"
          type="search"
          placeholder="Tìm món ăn, quán, địa điểm..."
          @keyup.enter="handleSearch"
          aria-label="Search deals"
        />
      </div>

      <div class="navbar-links" :class="{ 'is-open': uiStore.isMobileNavOpen }">
        <router-link to="/" class="nav-link" @click="uiStore.closeMobileNav()">Home</router-link>
        <router-link to="/explore" class="nav-link" @click="uiStore.closeMobileNav()">Explore</router-link>
        <router-link to="/news" class="nav-link" @click="uiStore.closeMobileNav()">News</router-link>
        <router-link to="/feed" class="nav-link" @click="uiStore.closeMobileNav()">Feed</router-link>
        <router-link to="/ai-search" class="nav-link" @click="uiStore.closeMobileNav()">AI Search</router-link>
        <template v-if="auth.isAuthenticated">
          <router-link v-if="auth.isAdmin" to="/dashboard" class="nav-link" @click="uiStore.closeMobileNav()">Dashboard</router-link>
          <router-link v-if="auth.isAdmin" to="/admin" class="nav-link" @click="uiStore.closeMobileNav()">Admin</router-link>
        </template>
      </div>

      <div class="navbar-actions">
        <template v-if="auth.isAuthenticated">
          <button class="btn-icon notification-btn" aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>
          <router-link to="/profile" class="nav-link-user" :title="auth.user?.username">
            {{ auth.user?.username?.charAt(0).toUpperCase() }}
          </router-link>
        </template>
        <template v-else>
          <router-link to="/login" class="btn btn-ghost btn-sm" style="padding:8px 16px">Sign In</router-link>
          <router-link to="/register" class="btn btn-primary btn-sm">Get Started</router-link>
        </template>

        <button
          class="theme-toggle btn-icon"
          @click="uiStore.toggleTheme()"
          :aria-label="uiStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <svg v-if="uiStore.isDark" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>

        <button
          class="mobile-menu-toggle btn-icon"
          @click="uiStore.toggleMobileNav()"
          :aria-label="uiStore.isMobileNavOpen ? 'Close menu' : 'Open menu'"
          :aria-expanded="uiStore.isMobileNavOpen ? 'true' : 'false'"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <line v-if="!uiStore.isMobileNavOpen" x1="3" y1="6" x2="21" y2="6"/>
            <line v-if="!uiStore.isMobileNavOpen" x1="3" y1="12" x2="21" y2="12"/>
            <line v-if="!uiStore.isMobileNavOpen" x1="3" y1="18" x2="21" y2="18"/>
            <line v-if="uiStore.isMobileNavOpen" x1="18" y1="6" x2="6" y2="18"/>
            <line v-if="uiStore.isMobileNavOpen" x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
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
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--color-border);
  transition: background var(--transition-slow), border-color var(--transition-slow);
}

.navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  gap: 16px;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--color-text);
  font-weight: 700;
  font-size: 1.125rem;
  flex-shrink: 0;
}

.navbar-title {
  letter-spacing: -0.02em;
}

.navbar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 360px;
  padding: 8px 14px;
  border-radius: var(--radius-full);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  transition: all var(--transition-fast);
}

.navbar-search:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  background: var(--color-bg);
}

.search-icon {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font-family);
  font-size: 0.875rem;
  color: var(--color-text);
  outline: none;
  min-width: 0;
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.navbar-links {
  display: flex;
  align-items: center;
  gap: 2px;
}

.nav-link {
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition: all var(--transition-fast);
}

.nav-link:hover {
  color: var(--color-text);
  background: var(--color-bg-secondary);
}

.nav-link.router-link-exact-active {
  color: var(--color-accent);
  background: var(--color-accent-light);
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-icon:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.notification-btn {
  position: relative;
}

.nav-link-user {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--color-accent-light);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  padding: 0;
  text-decoration: none;
  transition: all var(--transition-fast);
}

.nav-link-user:hover {
  background: var(--color-accent);
  color: white;
  transform: scale(1.05);
}

.mobile-menu-toggle {
  display: none;
}

@media (max-width: 1024px) {
  .navbar-search {
    display: none;
  }
}

@media (max-width: 768px) {
  .navbar-inner {
    height: 60px;
  }

  .navbar-links {
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    background: var(--color-glass-bg);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--color-border);
    flex-direction: column;
    padding: 8px 16px;
    gap: 2px;
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
    transition: all var(--transition-base);
  }

  .navbar-links.is-open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: all;
  }

  .nav-link {
    width: 100%;
    padding: 12px 16px;
  }

  .mobile-menu-toggle {
    display: flex;
  }
}
</style>
