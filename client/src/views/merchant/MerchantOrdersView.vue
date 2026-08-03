<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { merchantService } from '../../services/api'
import { getSocket } from '../../services/socket/socket'
import { useUiStore } from '../../stores/ui.store'
import MerchantNavBar from '../../components/merchant/MerchantNavBar.vue'
import RealtimeOrderTimeline from '../../components/common/RealtimeOrderTimeline.vue'
import { formatVND } from '../../utils/currency'

const uiStore = useUiStore()
const orders = ref<any[]>([])
const isLoading = ref(true)
const error = ref('')
const activeTab = ref('all')
const confirmingId = ref<string | null>(null)

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Pending Pickup' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'expired', label: 'Expired' },
]

const ORDER_STEPS = [
  { key: 'active', label: 'Hold Active', hint: 'Awaiting customer pickup' },
  { key: 'confirmed', label: 'Confirmed & Ready', hint: 'Pickup complete' },
]

let socket: any = null

onMounted(() => {
  loadOrders()
  socket = getSocket()
  socket.on('reservation:confirmed', onReservationConfirmed)
  socket.on('reservation:expired', onReservationExpired)
})

onUnmounted(() => {
  if (socket) {
    socket.off('reservation:confirmed', onReservationConfirmed)
    socket.off('reservation:expired', onReservationExpired)
  }
})

const filteredOrders = () => {
  if (activeTab.value === 'all') return orders.value
  return orders.value.filter((o) => o.status === activeTab.value)
}

function onReservationConfirmed(payload: { id: string }) {
  const order = orders.value.find((o) => o.id === payload.id)
  if (order) {
    order.status = 'confirmed'
    order.confirmedAt = new Date().toISOString()
  }
}

function onReservationExpired(payload: { id: string }) {
  const order = orders.value.find((o) => o.id === payload.id)
  if (order) order.status = 'expired'
}

async function loadOrders() {
  isLoading.value = true
  error.value = ''
  try {
    orders.value = await merchantService.getOrders()
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not load orders.'
  } finally {
    isLoading.value = false
  }
}

async function confirmPickup(order: any) {
  confirmingId.value = order.id
  try {
    await merchantService.confirmOrder(order.id)
    order.status = 'confirmed'
    order.confirmedAt = new Date().toISOString()
    uiStore.addToast('Pickup confirmed', 'success')
  } catch (err: any) {
    uiStore.addToast(err.response?.data?.message || 'Could not confirm pickup', 'error')
  } finally {
    confirmingId.value = null
  }
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function timelineFor(order: any) {
  if (order.status === 'confirmed') return { currentIndex: 2, state: 'active' as const }
  if (order.status === 'cancelled') return { currentIndex: 1, state: 'cancelled' as const }
  if (order.status === 'expired') return { currentIndex: 1, state: 'expired' as const }
  return { currentIndex: 0, state: 'active' as const }
}
</script>

<template>
  <div class="merchant-page">
    <div class="container">
      <div class="merchant-header">
        <h1>Order Pickup Queue</h1>
        <span class="merchant-subtitle">Confirm pickups in real time</span>
      </div>

      <MerchantNavBar />

      <div v-if="error" class="error-box">{{ error }}</div>

      <div class="tabs">
        <button
          v-for="tab in TABS"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="isLoading" class="orders-list">
        <div v-for="n in 4" :key="n" class="skeleton skeleton-card"></div>
      </div>

      <div v-else-if="filteredOrders().length === 0" class="empty-state">
        <h3>No orders</h3>
        <p>When customers reserve deals from your stores, their orders will appear here live.</p>
      </div>

      <div v-else class="orders-list">
        <article v-for="order in filteredOrders()" :key="order.id" class="order-card">
          <div class="order-top">
            <div>
              <h3>{{ order.dealTitle }}</h3>
              <p>{{ order.storeName || 'Your store' }}</p>
            </div>
            <span :class="['status-badge', order.status]">{{ order.status }}</span>
          </div>

          <RealtimeOrderTimeline
            class="order-timeline"
            :steps="ORDER_STEPS"
            :current-index="timelineFor(order).currentIndex"
            :state="timelineFor(order).state"
            :expires-at="order.expiresAt"
            :show-countdown="order.status === 'active'"
          />

          <div class="order-body">
            <div class="order-detail">
              <span class="order-label">Pickup Code</span>
              <span class="order-value code">{{ order.reservationCode || '—' }}</span>
            </div>
            <div class="order-detail">
              <span class="order-label">Quantity</span>
              <span class="order-value">{{ order.quantity }}</span>
            </div>
            <div class="order-detail">
              <span class="order-label">Amount</span>
              <span class="order-value">{{ formatVND(order.amount) }}</span>
            </div>
            <div class="order-detail">
              <span class="order-label">Reserved</span>
              <span class="order-value">{{ formatDate(order.reservedAt) }}</span>
            </div>
          </div>

          <div v-if="order.status === 'active'" class="order-actions">
            <button class="btn btn-primary" :disabled="confirmingId === order.id" @click="confirmPickup(order)">
              {{ confirmingId === order.id ? 'Confirming...' : 'Confirm Pickup' }}
            </button>
          </div>
        </article>
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

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.tab-btn {
  padding: 7px 16px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tab-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
}
.tab-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.skeleton-card {
  height: 210px;
  border-radius: var(--radius-md);
}
.order-card {
  padding: 20px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.order-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
}
.order-top h3 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 4px;
}
.order-top p {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}
.order-timeline {
  margin: 4px 0 18px;
  padding: 12px 16px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
}
.order-body {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}
.order-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.order-label {
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
}
.order-value {
  font-size: 0.95rem;
  font-weight: 700;
}
.order-value.code {
  font-family: monospace;
  font-size: 1.15rem;
  letter-spacing: 2px;
}
.order-actions {
  display: flex;
  gap: 8px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.status-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  background: var(--color-bg-tertiary);
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
.empty-state {
  text-align: center;
  padding: 60px 0;
  color: var(--color-text-secondary);
}
</style>
