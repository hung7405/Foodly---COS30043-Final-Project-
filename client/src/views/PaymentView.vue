<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { reservationsService, http } from '../services/api'
import { formatVND } from '../utils/currency'
import { useUiStore } from '../stores/ui.store'
import type { Reservation, Payment } from '../types'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const reservation = ref<Reservation | null>(null)
const payment = ref<Payment | null>(null)
const isLoading = ref(true)
const isPaying = ref(false)
const error = ref('')
const success = ref('')
const paymentMethod = ref<'mock' | 'momo' | 'vnpay'>('mock')
const countdown = ref(300)
let countdownTimer: number | undefined

onMounted(async () => {
  const reservationId = route.params.reservationId as string
  if (!reservationId) {
    error.value = 'No reservation specified'
    isLoading.value = false
    return
  }
  await loadReservation(reservationId)
  startCountdown()
})

async function loadReservation(id: string) {
  try {
    const all = await reservationsService.myReservations()
    const found = all.find((r: Reservation) => r.id === id)
    if (!found) {
      error.value = 'Reservation not found'
      return
    }
    reservation.value = found
  } catch {
    error.value = 'Could not load reservation'
  } finally {
    isLoading.value = false
  }
}

function startCountdown() {
  if (countdownTimer) window.clearInterval(countdownTimer)
  countdown.value = 300
  countdownTimer = window.setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      if (countdownTimer) window.clearInterval(countdownTimer)
      countdownTimer = undefined
      error.value = 'Payment time expired. Your reservation has been released.'
    }
  }, 1000)
}

onUnmounted(() => {
  if (countdownTimer) window.clearInterval(countdownTimer)
})

async function initiatePayment() {
  if (!reservation.value) return
  isPaying.value = true
  error.value = ''
  try {
    const { data } = await http.post(`/payments/reservations/${reservation.value.id}/pay`, {
      provider: paymentMethod.value,
    })
    payment.value = data
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Could not initiate payment'
  } finally {
    isPaying.value = false
  }
}

async function completeMockPayment() {
  if (!payment.value) return
  isPaying.value = true
  try {
    const { data } = await http.put(`/payments/${payment.value.id}/complete-mock`)
    payment.value = data
    success.value = 'Payment successful! Your pickup QR code is ready.'
    const total = Number(reservation.value?.deal?.discountPrice) * (reservation.value?.quantityReserved || 1)
    const xu = Math.max(1, Math.round(total / 1000))
    uiStore.addToast(`You earned +${xu} xu for this rescue!`, 'success')
    window.clearInterval(countdownTimer)
    setTimeout(() => router.push('/profile/reservations'), 2000)
  } catch (err: any) {
    error.value = err.message || 'Could not complete payment'
  } finally {
    isPaying.value = false
  }
}

function retry() {
  if (countdownTimer) window.clearInterval(countdownTimer)
  countdownTimer = undefined
  payment.value = null
  error.value = ''
  success.value = ''
  startCountdown()
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="payment-page">
    <div class="container">
      <router-link to="/profile/reservations" class="back-link">&larr; Back to reservations</router-link>

      <div v-if="error" class="state-banner error">{{ error }}</div>
      <div v-if="success" class="state-banner success">{{ success }}</div>

      <div v-if="isLoading" class="skeleton-loading">
        <div class="skeleton h-32"></div>
        <div class="skeleton h-16"></div>
      </div>

      <div v-else-if="reservation" class="payment-layout">
        <div class="payment-card summary-card">
          <h2>Payment summary</h2>
          <div class="summary-row">
            <span>{{ reservation.deal?.title || 'Deal' }}</span>
            <span>{{ formatVND(Number(reservation.deal?.discountPrice) * reservation.quantityReserved) }}</span>
          </div>
          <div class="summary-row">
            <span>Quantity</span>
            <span>x{{ reservation.quantityReserved }}</span>
          </div>
          <hr />
          <div class="summary-row total">
            <span><strong>Total</strong></span>
            <span
              ><strong>{{
                formatVND(Number(reservation.deal?.discountPrice) * reservation.quantityReserved)
              }}</strong></span
            >
          </div>
        </div>

        <div class="payment-card method-card">
          <h3>Payment method</h3>
          <div class="method-options">
            <label class="method-option" :class="{ selected: paymentMethod === 'mock' }">
              <input type="radio" v-model="paymentMethod" value="mock" />
              <div class="method-content">
                <span class="method-name">Mock Pay (Demo)</span>
                <span class="method-desc">Instant test payment</span>
              </div>
            </label>
            <label class="method-option" :class="{ selected: paymentMethod === 'momo' }">
              <input type="radio" v-model="paymentMethod" value="momo" />
              <div class="method-content">
                <span class="method-name">MoMo</span>
                <span class="method-desc">Scan QR with MoMo app</span>
              </div>
            </label>
            <label class="method-option" :class="{ selected: paymentMethod === 'vnpay' }">
              <input type="radio" v-model="paymentMethod" value="vnpay" />
              <div class="method-content">
                <span class="method-name">VNPay</span>
                <span class="method-desc">Pay via VNPay QR / card</span>
              </div>
            </label>
          </div>

          <div class="countdown-bar">
            <span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                style="vertical-align: -2px; margin-right: 6px"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Complete payment within
            </span>
            <span class="countdown-timer" :class="{ urgent: countdown <= 60 }">{{ formatCountdown(countdown) }}</span>
          </div>

          <button v-if="!payment" class="btn btn-primary btn-lg pay-btn" :disabled="isPaying" @click="initiatePayment">
            {{
              isPaying
                ? 'Processing...'
                : `Pay ${formatVND(Number(reservation.deal?.discountPrice) * reservation.quantityReserved)}`
            }}
          </button>
        </div>

        <div v-if="payment" class="payment-card qr-card">
          <h3>Scan to pay</h3>
          <div class="qr-wrapper">
            <img v-if="payment.qrCodeUrl" :src="payment.qrCodeUrl" alt="Payment QR code" class="qr-image" />
            <div v-else class="qr-placeholder">QR code not available</div>
          </div>
          <p class="qr-hint">Scan with {{ paymentMethod === 'momo' ? 'MoMo' : 'VNPay' }} app or banking app</p>

          <div v-if="paymentMethod === 'mock'" class="mock-pay-section">
            <p class="mock-hint">Mock payment: click to simulate successful payment</p>
            <button class="btn btn-primary btn-lg" :disabled="isPaying || !!success" @click="completeMockPayment">
              <svg
                v-if="!isPaying"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {{ isPaying ? 'Processing...' : 'Confirm payment (Demo)' }}
            </button>
          </div>

          <button v-if="!success" class="btn btn-outline btn-sm" @click="retry">Cancel & retry</button>
        </div>
      </div>

      <div v-else-if="!isLoading" class="empty-state">
        <h3>No reservation found</h3>
        <p>This reservation may have expired or been cancelled.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.payment-page {
  padding: 24px 0 60px;
}
.back-link {
  display: inline-block;
  margin-bottom: 20px;
  color: var(--color-text-secondary);
  font-weight: 600;
}
.state-banner {
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: var(--radius-sm);
}
.state-banner.error {
  background: #fff7ed;
  color: #9a3412;
  border: 1px solid #fdba74;
}
.state-banner.success {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #86efac;
}
.payment-layout {
  display: grid;
  gap: 24px;
  max-width: 640px;
  margin: 0 auto;
}
.payment-card {
  padding: 24px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-card-bg);
}
.summary-card h2 {
  margin-bottom: 16px;
  font-size: 1.25rem;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  color: var(--color-text-secondary);
}
.summary-row.total {
  font-size: 1.12rem;
}
h3 {
  margin-bottom: 14px;
  font-size: 1.05rem;
}
.method-options {
  display: grid;
  gap: 10px;
  margin-bottom: 20px;
}
.method-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}
.method-option.selected {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}
.method-option input {
  display: none;
}
.method-content {
  display: grid;
  gap: 2px;
}
.method-name {
  font-weight: 600;
  color: var(--color-text);
}
.method-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}
.countdown-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  font-size: 0.92rem;
}
.countdown-timer {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--color-text);
}
.countdown-timer.urgent {
  color: #dc2626;
  animation: pulse 1s infinite;
}
.pay-btn {
  width: 100%;
  justify-content: center;
  font-size: 1.1rem;
}
.qr-card {
  text-align: center;
}
.qr-wrapper {
  margin: 16px auto;
  max-width: 280px;
}
.qr-image {
  width: 100%;
  border-radius: var(--radius-sm);
}
.qr-placeholder {
  width: 280px;
  height: 280px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
}
.qr-hint {
  color: var(--color-text-secondary);
  font-size: 0.92rem;
  margin-bottom: 20px;
}
.mock-pay-section {
  margin: 20px 0;
  padding: 16px;
  background: #f0fdf4;
  border-radius: var(--radius-sm);
}
.mock-hint {
  color: #166534;
  font-size: 0.88rem;
  margin-bottom: 12px;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
