<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const items = [
  { to: '/merchant', label: 'Dashboard', exact: true },
  { to: '/merchant/orders', label: 'Orders' },
  { to: '/merchant/deals', label: 'Deals' },
]

function isActive(item: { to: string; exact?: boolean }) {
  if (item.exact) return route.path === item.to
  return route.path.startsWith(item.to)
}
</script>

<template>
  <nav class="merchant-nav" aria-label="Merchant navigation">
    <router-link
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="merchant-nav-item"
      :class="{ active: isActive(item) }"
    >
      {{ item.label }}
    </router-link>
  </nav>
</template>

<style scoped>
.merchant-nav {
  display: flex;
  gap: 4px;
  margin-bottom: 28px;
  padding: 4px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  overflow-x: auto;
}
.merchant-nav-item {
  padding: 8px 18px;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  white-space: nowrap;
  text-decoration: none;
  transition: background 0.2s ease, color 0.2s ease;
}
.merchant-nav-item:hover { color: var(--color-text); }
.merchant-nav-item.active {
  background: var(--color-card-bg);
  color: var(--color-accent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
</style>
