<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { merchantService } from '../../services/api'
import MerchantNavBar from '../../components/merchant/MerchantNavBar.vue'
import { formatVND } from '../../utils/currency'

const isLoading = ref(true)
const error = ref('')
const dashboard = ref<any>(null)

onMounted(load)

async function load() {
  isLoading.value = true
  error.value = ''
  try {
    dashboard.value = await merchantService.getDashboard()
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not load dashboard.'
  } finally {
    isLoading.value = false
  }
}

const stats = computed(() => dashboard.value?.todayStats)
const maxTrend = computed(() => Math.max(...(dashboard.value?.revenueTrend || []).map((d: any) => d.revenue), 1))

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="merchant-page">
    <div class="container">
      <div class="merchant-header">
        <h1>Merchant Dashboard</h1>
        <span v-if="!isLoading && !error" class="merchant-subtitle">
          {{ dashboard?.totalDeals ?? 0 }} deals across {{ dashboard?.stores?.length ?? 0 }} stores
        </span>
      </div>

      <MerchantNavBar />

      <div v-if="error" class="error-box">{{ error }}</div>

      <div v-if="isLoading" class="skeleton-grid">
        <div v-for="n in 4" :key="n" class="skeleton skeleton-card"></div>
      </div>

      <template v-else-if="stats">
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">{{ formatVND(stats.revenue) }}</div>
            <div class="metric-label">Revenue Today</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ stats.orders }}</div>
            <div class="metric-label">Orders Today</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ stats.pendingPickups }}</div>
            <div class="metric-label">Pending Pickups</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ dashboard?.activeDeals ?? 0 }}</div>
            <div class="metric-label">Active Deals</div>
          </div>
        </div>

        <div class="dashboard-grid">
          <section class="panel">
            <h3>Revenue — last 7 days</h3>
            <div v-if="dashboard?.revenueTrend?.length" class="bar-chart">
              <div v-for="(d, i) in dashboard.revenueTrend" :key="i" class="bar-col">
                <div class="bar-value" v-if="d.revenue > 0">{{ formatVND(d.revenue) }}</div>
                <div class="bar" :style="{ height: `${Math.max((d.revenue / maxTrend) * 100, 4)}%` }"></div>
                <div class="bar-label">{{ d.label }}</div>
              </div>
            </div>
            <div v-else class="empty-inline">No confirmed pickups in the last 7 days.</div>
          </section>

          <section class="panel">
            <h3>Top Products</h3>
            <div v-if="dashboard?.topProducts?.length" class="product-list">
              <div v-for="(p, i) in dashboard.topProducts" :key="i" class="product-row">
                <span class="product-rank">{{ Number(i) + 1 }}</span>
                <span class="product-name">{{ p.title }}</span>
                <span class="product-sold">{{ p.sold }} sold</span>
              </div>
            </div>
            <div v-else class="empty-inline">No sales yet.</div>
          </section>

          <section class="panel">
            <h3>Low Stock Alerts</h3>
            <div v-if="dashboard?.lowStockDeals?.length" class="alert-list">
              <div v-for="d in dashboard.lowStockDeals" :key="d.id" class="alert-row">
                <span class="alert-dot" :class="{ critical: d.remaining <= 2 }"></span>
                <span class="alert-title">{{ d.title }}</span>
                <span class="alert-count">{{ d.remaining }} left</span>
              </div>
            </div>
            <div v-else class="empty-inline">All deals are sufficiently stocked.</div>
          </section>

          <section class="panel">
            <h3>Recent Orders</h3>
            <div v-if="dashboard?.recentOrders?.length" class="order-list">
              <div v-for="o in dashboard.recentOrders" :key="o.id" class="order-row">
                <span :class="['status-badge', o.status]">{{ o.status }}</span>
                <div class="order-info">
                  <span class="order-title">{{ o.dealTitle }}</span>
                  <span class="order-meta"
                    >{{ formatDate(o.reservedAt) }} · {{ o.quantity }} × · {{ o.reservationCode }}</span
                  >
                </div>
                <span class="order-amount">{{ formatVND(o.amount) }}</span>
              </div>
            </div>
            <div v-else class="empty-inline">No orders yet.</div>
          </section>
        </div>
      </template>

      <div v-else-if="!error" class="empty-state">
        <h3>No stores linked</h3>
        <p>
          This account does not own any stores yet. Assign <code>stores.user_id</code> to link a store to this merchant.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.merchant-page {
  padding: 40px 0 60px;
  animation: fade-in 0.4s ease;
}
.merchant-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.merchant-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
}
.merchant-subtitle {
  color: var(--color-text-tertiary);
  font-size: 0.9rem;
}
.error-box {
  padding: 14px 16px;
  background: #fff7ed;
  color: #9a3412;
  border: 1px solid #fdba74;
  border-radius: var(--radius-sm);
  margin-bottom: 18px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.metric-card {
  padding: 24px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.metric-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: 4px;
}
.metric-label {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.panel {
  padding: 22px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.panel h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 200px;
}
.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  gap: 4px;
}
.bar {
  width: 100%;
  max-width: 46px;
  background: var(--color-accent);
  border-radius: 4px 4px 0 0;
  transition: height 0.5s ease;
}
.bar-value {
  font-size: 0.68rem;
  color: var(--color-text-secondary);
  font-weight: 600;
  white-space: nowrap;
}
.bar-label {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
  margin-top: 4px;
}

.product-list,
.alert-list,
.order-list {
  display: flex;
  flex-direction: column;
}
.product-row,
.alert-row,
.order-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.875rem;
}
.product-row:last-child,
.alert-row:last-child,
.order-row:last-child {
  border-bottom: none;
}
.product-rank {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
.product-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.product-sold {
  color: var(--color-accent);
  font-weight: 700;
  flex-shrink: 0;
}

.alert-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  flex-shrink: 0;
}
.alert-dot.critical {
  background: var(--color-error);
}
.alert-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.alert-count {
  color: var(--color-text-secondary);
  font-weight: 600;
  flex-shrink: 0;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  background: var(--color-bg-tertiary);
  flex-shrink: 0;
}
.status-badge.active {
  background: #ecfdf5;
  color: #166534;
}
.status-badge.confirmed {
  background: #dcfce7;
  color: #166534;
}
.status-badge.cancelled,
.status-badge.expired {
  background: #f1f5f9;
  color: #64748b;
}

.order-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.order-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.order-meta {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}
.order-amount {
  font-weight: 700;
  flex-shrink: 0;
}

.empty-inline {
  padding: 20px 0;
  color: var(--color-text-tertiary);
  font-size: 0.875rem;
  text-align: center;
}
.empty-state {
  text-align: center;
  padding: 60px 0;
  color: var(--color-text-secondary);
}
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.skeleton-card {
  height: 130px;
  border-radius: var(--radius-lg);
}

@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: 1fr 1fr;
  }
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
