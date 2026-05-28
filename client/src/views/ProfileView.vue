<script setup lang="ts">
import { useAuthStore } from '../stores/auth.store'

const auth = useAuthStore()
</script>

<template>
  <div class="profile-page">
    <div class="container-narrow">
      <div class="profile-card">
        <div class="profile-avatar">{{ auth.user?.username?.charAt(0).toUpperCase() || '?' }}</div>
        <h1>{{ auth.user?.firstName || auth.user?.username }}</h1>
        <p class="profile-email">{{ auth.user?.email }}</p>
        <div class="profile-meta">
          <span class="meta-badge">⭐ Trust Score: {{ auth.user?.trustScore || 'N/A' }}</span>
          <span class="meta-badge">🎖️ {{ auth.user?.role }}</span>
        </div>
      </div>

      <div class="profile-links">
        <router-link to="/profile/deals" class="profile-link-card">
          <span class="link-icon">🛒</span>
          <span class="link-text">
            <strong>My Deals</strong>
            <small>Manage your listings</small>
          </span>
          <span class="link-arrow">→</span>
        </router-link>
        <router-link to="/profile/reservations" class="profile-link-card">
          <span class="link-icon">📦</span>
          <span class="link-text">
            <strong>My Reservations</strong>
            <small>View your reserved items</small>
          </span>
          <span class="link-arrow">→</span>
        </router-link>
        <router-link to="/deals/new" class="profile-link-card">
          <span class="link-icon">➕</span>
          <span class="link-text">
            <strong>Post a Deal</strong>
            <small>Share discounted food</small>
          </span>
          <span class="link-arrow">→</span>
        </router-link>
      </div>

      <button class="btn btn-outline logout-btn" @click="auth.logout(); $router.push('/')">Sign Out</button>
    </div>
  </div>
</template>

<style scoped>
.profile-page { padding: 40px 0; animation: fade-in 0.4s ease; }
.profile-card { text-align: center; padding: 40px; background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: var(--radius-xl); margin-bottom: 24px; }
.profile-avatar { width: 80px; height: 80px; border-radius: 50%; background: var(--color-accent-light); color: var(--color-accent); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 700; margin: 0 auto 16px; }
.profile-card h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 4px; }
.profile-email { color: var(--color-text-secondary); margin-bottom: 16px; }
.profile-meta { display: flex; gap: 8px; justify-content: center; }
.meta-badge { padding: 4px 12px; background: var(--color-bg-tertiary); border-radius: 100px; font-size: 0.8125rem; }
.profile-links { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
.profile-link-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); text-decoration: none; color: var(--color-text); transition: all var(--transition-fast); }
.profile-link-card:hover { border-color: var(--color-accent); box-shadow: var(--shadow-md); }
.link-icon { font-size: 1.5rem; }
.link-text { flex: 1; }
.link-text strong { display: block; font-size: 1rem; margin-bottom: 2px; }
.link-text small { color: var(--color-text-secondary); font-size: 0.8125rem; }
.link-arrow { color: var(--color-text-tertiary); font-size: 1.25rem; }
.logout-btn { width: 100%; }
</style>
