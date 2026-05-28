<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminService, dealsService } from '../services/api'
import type { Deal, User } from '../types'
import { formatVND } from '../utils/currency'

const users = ref<User[]>([])
const deals = ref<Deal[]>([])
const dashboard = ref({ totalUsers: 0, totalDeals: 0, activeDeals: 0 })
const isLoading = ref(true)
const error = ref('')

onMounted(loadAdminData)

async function loadAdminData() {
  isLoading.value = true
  error.value = ''
  try {
    const [dash, userResult, dealResult] = await Promise.all([
      adminService.getDashboard(),
      adminService.findUsers(),
      adminService.getReviewDeals(),
    ])
    dashboard.value = dash
    users.value = userResult.users || []
    deals.value = dealResult.deals || []
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not load admin data. Login as admin first.'
  } finally {
    isLoading.value = false
  }
}

async function toggleBan(user: User) {
  try {
    const updated = await adminService.banUser(user.id)
    Object.assign(user, updated)
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not update user status.'
  }
}

async function changeRole(user: User, role: string) {
  try {
    const updated = await adminService.changeUserRole(user.id, role)
    Object.assign(user, updated)
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not update role.'
  }
}

async function verifyDeal(deal: Deal) {
  try {
    const updated = await dealsService.verify(deal.id, 'verified')
    Object.assign(deal, updated)
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not verify deal.'
  }
}
</script>

<template>
  <div class="admin-page">
    <div class="container">
      <div class="admin-header">
        <div>
          <h1>Admin Panel</h1>
          <p>Moderate trust, users, and live rescue listings.</p>
        </div>
        <span class="admin-badge">Admin</span>
      </div>

      <div v-if="error" class="error-box">{{ error }}</div>

      <div class="metric-grid">
        <div class="metric-card"><strong>{{ dashboard.totalUsers }}</strong><span>Total users</span></div>
        <div class="metric-card"><strong>{{ dashboard.totalDeals }}</strong><span>Total deals</span></div>
        <div class="metric-card"><strong>{{ dashboard.activeDeals }}</strong><span>Active deals</span></div>
      </div>

      <div v-if="isLoading" class="loading-grid">
        <div class="skeleton skeleton-block"></div>
        <div class="skeleton skeleton-block"></div>
      </div>

      <template v-else>
        <section class="admin-section">
          <h2>User Management</h2>
          <div class="admin-table user-table">
            <div class="table-header">
              <span>User</span><span>Role</span><span>Trust</span><span>Status</span><span>Actions</span>
            </div>
            <div v-for="user in users" :key="user.id" class="table-row">
              <span><strong>{{ user.username }}</strong><br /><small>{{ user.email }}</small></span>
              <span>
                <select :value="user.role" @change="changeRole(user, ($event.target as HTMLSelectElement).value)">
                  <option value="user">user</option>
                  <option value="moderator">moderator</option>
                  <option value="admin">admin</option>
                </select>
              </span>
              <span>{{ Number(user.trustScore).toFixed(1) }}</span>
              <span :class="user.isActive ? 'active' : 'banned'">{{ user.isActive ? 'Active' : 'Banned' }}</span>
              <span><button class="btn btn-outline btn-sm" @click="toggleBan(user)">{{ user.isActive ? 'Ban' : 'Unban' }}</button></span>
            </div>
          </div>
        </section>

        <section class="admin-section">
          <h2>Deal Moderation</h2>
          <div class="admin-table deal-table">
            <div class="table-header">
              <span>Deal</span><span>Store</span><span>Status</span><span>Verified</span><span>Actions</span>
            </div>
            <div v-for="deal in deals" :key="deal.id" class="table-row">
              <span><strong>{{ deal.title }}</strong><br /><small>{{ formatVND(Number(deal.discountPrice)) }} · {{ deal.remainingQuantity }} left</small></span>
              <span>{{ deal.store?.name || 'Community' }}</span>
              <span>{{ deal.status }}</span>
              <span :class="deal.verified ? 'active' : 'pending'">{{ deal.verified ? 'Verified' : 'Pending' }}</span>
              <span>
                <button v-if="!deal.verified" class="btn btn-primary btn-sm" @click="verifyDeal(deal)">Verify</button>
                <router-link :to="`/deals/${deal.id}`" class="btn btn-outline btn-sm">View</router-link>
              </span>
            </div>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.admin-page { padding: 40px 0 60px; animation: fade-in 0.4s ease; }
.admin-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 28px; }
.admin-header h1 { font-size: 1.75rem; font-weight: 700; }
.admin-header p { color: var(--color-text-secondary); }
.admin-badge { padding: 5px 12px; background: #dcfce7; color: #166534; border-radius: 999px; font-size: 0.78rem; font-weight: 800; }
.error-box { padding: 14px 16px; background: #fff7ed; color: #9a3412; border: 1px solid #fdba74; border-radius: var(--radius-sm); margin-bottom: 18px; }
.metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
.metric-card { padding: 20px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-card-bg); }
.metric-card strong { display: block; font-size: 2rem; color: var(--color-accent); }
.metric-card span { color: var(--color-text-secondary); }
.loading-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.skeleton-block { height: 260px; border-radius: var(--radius-lg); }
.admin-section { margin-bottom: 36px; }
.admin-section h2 { font-size: 1.1rem; font-weight: 700; margin-bottom: 14px; }
.admin-table { border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; background: var(--color-card-bg); }
.table-header, .table-row { display: grid; grid-template-columns: 2fr 1.1fr 0.8fr 0.9fr 1.1fr; gap: 14px; padding: 13px 18px; font-size: 0.875rem; align-items: center; }
.table-header { background: var(--color-bg-secondary); font-weight: 800; color: var(--color-text-secondary); }
.table-row + .table-row { border-top: 1px solid var(--color-border); }
.table-row small { color: var(--color-text-tertiary); }
.table-row select { width: 100%; padding: 7px 9px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-text); }
.table-row span:last-child { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-sm { padding: 6px 12px; font-size: 0.8rem; }
.active { color: var(--color-success); font-weight: 800; }
.banned { color: var(--color-error); font-weight: 800; }
.pending { color: var(--color-warning); font-weight: 800; }
@media (max-width: 820px) { .metric-grid, .loading-grid { grid-template-columns: 1fr; } .table-header, .table-row { grid-template-columns: 1fr; gap: 8px; } }
</style>
