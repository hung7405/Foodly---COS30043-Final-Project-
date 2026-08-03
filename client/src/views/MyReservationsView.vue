<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { reservationsService, paymentsService } from '../services/api'
import { getSocket } from '../services/socket/socket'
import RealtimeOrderTimeline from '../components/common/RealtimeOrderTimeline.vue'
import type { Reservation, Payment } from '../types'

const reservations = ref<Reservation[]>([])
const isLoading = ref(true)
const error = ref('')
const paidReservationIds = ref<Set<string>>(new Set())

const TIMELINE_STEPS = [
  { key: 'active', label: 'Hold Active', hint: 'Item reserved for you' },
  { key: 'confirmed', label: 'Confirmed & Ready', hint: 'Store is holding your item' },
]

let socket: any = null

onMounted(() => {
  loadReservations()
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

function timelineFor(res: Reservation) {
  switch (res.status) {
    case 'active':
      return { currentIndex: 0, state: 'active' as const }
    case 'confirmed':
      return { currentIndex: 2, state: 'active' as const }
    case 'cancelled':
      return { currentIndex: 1, state: 'cancelled' as const }
    case 'expired':
      return { currentIndex: 1, state: 'expired' as const }
    default:
      return { currentIndex: 0, state: 'active' as const }
  }
}

function onReservationConfirmed(payload: { id: string }) {
  const res = reservations.value.find((r) => r.id === payload.id)
  if (res) res.status = 'confirmed'
}

function onReservationExpired(payload: { id: string }) {
  const res = reservations.value.find((r) => r.id === payload.id)
  if (res) res.status = 'expired'
}

async function loadReservations() {
  isLoading.value = true
  error.value = ''
  try {
    const [resList, payList] = await Promise.all([
      reservationsService.myReservations(),
      paymentsService.myPayments().catch(() => []),
    ])
    reservations.value = resList
    paidReservationIds.value = new Set(
      (payList as Payment[]).filter((p) => p.status === 'completed').map((p) => p.reservationId)
    )
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not load reservations.'
  } finally {
    isLoading.value = false
  }
}

function isPaid(id: string) {
  return paidReservationIds.value.has(id)
}

async function cancel(id: string) {
  try {
    await reservationsService.cancel(id)
    await loadReservations()
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not cancel reservation.'
  }
}

async function confirm(id: string) {
  try {
    await reservationsService.confirm(id)
    await loadReservations()
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not confirm pickup.'
  }
}
</script>

<template>
  <div class="reservations-page">
    <div class="container-narrow">
      <h1 class="page-title">My Reservations</h1>
      <div v-if="error" class="error-box">{{ error }}</div>

      <div v-if="isLoading" class="reservations-list">
        <div v-for="n in 3" :key="n" class="skeleton skeleton-card"></div>
      </div>

      <div v-else-if="reservations.length === 0" class="empty-state">
        <h3>No reservations</h3>
        <p>Explore deals, reserve an item, then return here to confirm the hold and pickup code.</p>
        <router-link to="/explore" class="btn btn-outline" style="margin-top: 16px">Browse Deals</router-link>
      </div>

      <div v-else class="reservations-list">
        <article v-for="res in reservations" :key="res.id" class="reservation-card">
          <div class="res-top">
            <div>
              <h3>{{ res.deal?.title || 'Reserved deal' }}</h3>
              <p>{{ res.deal?.store?.name || res.deal?.address || 'Pickup location' }}</p>
            </div>
            <span :class="['status-badge', res.status]">{{ res.status }}</span>
          </div>
          <RealtimeOrderTimeline
            class="res-timeline"
            :steps="TIMELINE_STEPS"
            :current-index="timelineFor(res).currentIndex"
            :state="timelineFor(res).state"
            :expires-at="res.expiresAt"
            :show-countdown="res.status === 'active'"
          />
          <div class="res-body">
            <div class="res-detail">
              <span class="res-label">Pickup Code</span>
              <span class="res-value code">{{ res.reservationCode || 'Pending' }}</span>
            </div>
            <div class="res-detail">
              <span class="res-label">Quantity</span>
              <span class="res-value">{{ res.quantityReserved }}</span>
            </div>
          </div>
          <div class="res-actions">
            <router-link v-if="res.dealId" :to="`/deals/${res.dealId}`" class="btn btn-outline">View Deal</router-link>
            <router-link
              v-if="res.status === 'active' && !isPaid(res.id)"
              :to="`/payments/${res.id}`"
              class="btn btn-primary"
              >Pay now</router-link
            >
            <button v-if="res.status === 'active' && isPaid(res.id)" class="btn btn-primary" @click="confirm(res.id)">
              Confirm Pickup
            </button>
            <button v-if="res.status === 'active'" class="btn btn-ghost danger" @click="cancel(res.id)">Cancel</button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reservations-page {
  padding: 40px 0 60px;
  animation: fade-in 0.4s ease;
}
.page-title {
  font-size: 1.55rem;
  font-weight: 700;
  margin-bottom: 28px;
}
.error-box {
  padding: 14px 16px;
  background: #fff7ed;
  color: #9a3412;
  border: 1px solid #fdba74;
  border-radius: var(--radius-sm);
  margin-bottom: 18px;
}
.reservations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skeleton-card {
  height: 170px;
  border-radius: var(--radius-md);
}
.reservation-card {
  padding: 20px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.res-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
}
.res-top h3 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 4px;
}
.res-top p {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}
.status-badge {
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
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
.res-body {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}
.res-timeline {
  margin: 4px 0 20px;
  padding: 12px 16px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
}
.res-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.res-label {
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
}
.res-value {
  font-size: 0.95rem;
  font-weight: 700;
}
.res-value.code {
  font-family: monospace;
  font-size: 1.15rem;
  letter-spacing: 2px;
}
.res-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}
.danger {
  color: var(--color-error);
}
</style>
