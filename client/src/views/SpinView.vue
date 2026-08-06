<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { rewardsService } from '../services/api'
import { useAuthStore } from '../stores/auth.store'
import { useUiStore } from '../stores/ui.store'

const router = useRouter()
const auth = useAuthStore()
const uiStore = useUiStore()

const balance = ref(0)
const result = ref<{ prize: number; alreadyUsed: boolean; streak?: number; streakBonus?: number } | null>(null)
const isSpinning = ref(false)
const rotation = ref(0)
const spinningTo = ref(0)
const isUsed = ref(false)
const nextSpinAt = ref<string | null>(null)
const streak = ref(0)
const streakBonus = ref(0)
const nowTs = ref(Date.now())
let countdownTimer: number | undefined

const PRIZES = [
  { label: '10 xu', weight: 40, points: 10 },
  { label: '20 xu', weight: 30, points: 20 },
  { label: '30 xu', weight: 15, points: 30 },
  { label: '50 xu', weight: 10, points: 50 },
  { label: '100 xu', weight: 4, points: 100 },
  { label: '200 xu', weight: 1, points: 200 },
]

const sliceAngle = 360 / PRIZES.length
const sliceIndex = computed(() => Math.floor(((360 - (spinningTo.value % 360)) % 360) / sliceAngle))

const remainingMs = computed(() => {
  if (!nextSpinAt.value) return 0
  return Math.max(0, new Date(nextSpinAt.value).getTime() - nowTs.value)
})
const countdownText = computed(() => {
  if (remainingMs.value <= 0) return ''
  const total = Math.floor(remainingMs.value / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
})

async function load() {
  try {
    const st = await rewardsService.getSpinStatus()
    isUsed.value = st.usedToday
    nextSpinAt.value = st.nextSpinAt
    balance.value = st.balance
    streak.value = st.streak || 0
    streakBonus.value = st.streakBonus || 0
  } catch {
    try {
      const bal = await rewardsService.getBalance()
      balance.value = bal.balance
    } catch {
      balance.value = 0
    }
  }
  startCountdown()
}

function startCountdown() {
  if (countdownTimer) window.clearInterval(countdownTimer)
  countdownTimer = undefined
  if (!nextSpinAt.value) return
  nowTs.value = Date.now()
  countdownTimer = window.setInterval(() => {
    nowTs.value = Date.now()
    if (remainingMs.value > 0) return
    window.clearInterval(countdownTimer)
    countdownTimer = undefined
    isUsed.value = false
    nextSpinAt.value = null
    load()
  }, 1000)
}

onMounted(load)

onUnmounted(() => {
  if (countdownTimer) window.clearInterval(countdownTimer)
  countdownTimer = undefined
})

function angleForIndex(i: number) {
  return (360 - (i * sliceAngle + sliceAngle / 2)) % 360
}

async function spin() {
  if (!auth.isAuthenticated) {
    uiStore.addToast('Please sign in to spin the wheel.', 'error')
    router.push({ path: '/login', query: { redirect: '/spin' } })
    return
  }
  if (isSpinning.value || isUsed.value) return
  isSpinning.value = true
  result.value = null
  try {
    const res = await rewardsService.dailySpin()
    if (res.alreadyUsed) {
      isUsed.value = true
      nextSpinAt.value = res.nextSpinAt
      result.value = { prize: 0, alreadyUsed: true, streak: res.streak }
      streak.value = res.streak || 0
      streakBonus.value = 0
      balance.value = res.balance
      startCountdown()
      return
    }
    const idx = PRIZES.findIndex((p) => p.points === res.prize)
    const target = angleForIndex(idx < 0 ? 0 : idx)
    const spins = 5 * 360 + target
    spinningTo.value = rotation.value + spins
    rotation.value += spins
    result.value = res
    balance.value = res.balance
    streak.value = res.streak || 0
    streakBonus.value = res.streakBonus || 0
    isUsed.value = true
    nextSpinAt.value = res.nextSpinAt
    startCountdown()
    setTimeout(() => {
      const msg = res.streakBonus > 0 ? `You won +${res.prize} xu (+${res.streakBonus} streak bonus)!` : `You won +${res.prize} xu!`
      uiStore.addToast(msg, 'success')
    }, 3600)
  } catch (err: any) {
    uiStore.addToast(err.response?.data?.message || 'Could not spin. Try again tomorrow.', 'error')
  } finally {
    setTimeout(() => {
      isSpinning.value = false
    }, 3800)
  }
}
</script>

<template>
  <div class="spin-page">
    <div class="container-narrow">
      <h1 class="page-title">Daily Bonus Wheel</h1>
      <p class="page-subtitle">
        Spin once a day to earn extra xu — spend them on vouchers, or just feel great about saving food.
      </p>

      <div class="spin-layout">
        <div class="wheel-wrap">
          <div class="wheel" :style="{ transform: `rotate(${rotation}deg)` }">
            <div
              v-for="(p, i) in PRIZES"
              :key="p.label"
              class="wheel-slice"
              :class="`slice-${i}`"
              :style="{ '--start': i * sliceAngle + 'deg', '--span': sliceAngle + 'deg' }"
            >
              <span>{{ p.label }}</span>
            </div>
          </div>
          <div class="wheel-pointer">▼</div>
        </div>

        <div class="spin-side">
          <div class="streak-card">
            <div class="streak-emoji" aria-hidden="true">🔥</div>
            <div class="streak-body">
              <div class="streak-title">
                {{ streak >= 1 ? streak + '-day streak' : 'Start your daily streak' }}
              </div>
              <div v-if="!isUsed && streak > 0" class="streak-sub">
                Spin today for +{{ streakBonus }} bonus
              </div>
              <div v-else-if="isUsed" class="streak-sub">Come back tomorrow to keep it alive</div>
              <div v-else class="streak-sub">Spin daily — bonus up to +100</div>
            </div>
          </div>

          <div class="balance-card">
            <div class="balance-label">Your balance</div>
            <div class="balance-value">{{ balance }} <span>xu</span></div>
          </div>

          <button class="btn btn-primary btn-lg spin-btn" :disabled="isSpinning || isUsed" @click="spin">
            {{ isSpinning ? 'Spinning...' : 'Spin for free' }}
          </button>

          <div v-if="isUsed && countdownText" class="next-spin" role="status" aria-live="polite">
            <span class="next-spin-label">Next free spin in</span>
            <span class="next-spin-timer">{{ countdownText }}</span>
          </div>

          <div v-if="result" class="result-card" :class="{ used: result.alreadyUsed }">
            <template v-if="result.alreadyUsed">
              <h3>Come back tomorrow!</h3>
              <p>You have already spun today.</p>
            </template>
            <template v-else>
              <h3>You won!</h3>
              <p class="result-prize">+{{ result.prize }} xu added to your balance</p>
              <p v-if="result.streakBonus && result.streakBonus > 0" class="result-streak">
                +{{ result.streakBonus }} xu streak bonus (day {{ result.streak }})
              </p>
            </template>
          </div>

          <div class="prizes-list">
            <div
              v-for="p in PRIZES"
              :key="p.label"
              class="prize-row"
              :class="{ hit: result && !result.alreadyUsed && p.points === result.prize }"
            >
              <span
                class="prize-dot"
                :style="{
                  background: `hsl(${(((sliceIndex * sliceAngle) / 10) % 360) + ((p.points * 37) % 360)}, 70%, 55%)`,
                }"
              ></span>
              <span>{{ p.label }}</span>
              <span class="prize-chance">{{ p.weight }}%</span>
            </div>
          </div>

          <p class="bonus-ladder">Streak bonus: D2 +10 · D3 +20 · D4 +30 · D5 +50 · D6 +75 · D7+ +100</p>

          <router-link to="/profile" class="btn btn-outline back-btn">Back to profile</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spin-page {
  padding: 40px 0 60px;
  animation: fade-in 0.4s ease;
}
.page-title {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 4px;
}
.page-subtitle {
  color: var(--color-text-secondary);
  margin-bottom: 28px;
}
.spin-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: start;
}
.wheel-wrap {
  position: relative;
  display: flex;
  justify-content: center;
  padding-top: 10px;
}
.wheel {
  width: 320px;
  height: 320px;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
  border: 8px solid var(--color-card-bg);
  box-shadow: var(--shadow-lg);
  transition: transform 4s cubic-bezier(0.15, 0.6, 0.2, 1);
}
.wheel-slice {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: conic-gradient(from var(--start), var(--c) 0deg, var(--c) var(--span), transparent var(--span));
}
.wheel-slice:nth-child(1) {
  --c: #f87171;
}
.wheel-slice:nth-child(2) {
  --c: #fbbf24;
}
.wheel-slice:nth-child(3) {
  --c: #34d399;
}
.wheel-slice:nth-child(4) {
  --c: #60a5fa;
}
.wheel-slice:nth-child(5) {
  --c: #a78bfa;
}
.wheel-slice:nth-child(6) {
  --c: #f472b6;
}
.wheel-slice span {
  color: #fff;
  font-size: 0.9rem;
  font-weight: 800;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  transform: translateX(-50%);
  position: absolute;
  top: 34px;
  left: 50%;
}
.wheel-pointer {
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.6rem;
  color: var(--color-accent);
  z-index: 2;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}
.spin-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.streak-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #fff7ed, #ffedd5);
  border: 1px solid #fed7aa;
}
.streak-emoji {
  font-size: 1.6rem;
}
.streak-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: #7c2d12;
}
.streak-sub {
  font-size: 0.8125rem;
  color: #9a3412;
}
.bonus-ladder {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  text-align: center;
  margin: 4px 0 0;
}
.result-streak {
  margin-top: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #166534;
}
.balance-card {
  padding: 20px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #78350f;
}
.balance-label {
  font-weight: 600;
  font-size: 0.8125rem;
  opacity: 0.85;
}
.balance-value {
  font-size: 2rem;
  font-weight: 800;
}
.balance-value span {
  font-size: 0.9rem;
  font-weight: 600;
}
.spin-btn {
  justify-content: center;
  padding: 14px;
}
.next-spin {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
}
.next-spin-label {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}
.next-spin-timer {
  font-family: var(--font-mono, monospace);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-accent);
  letter-spacing: 0.04em;
}
.result-card {
  padding: 16px;
  border-radius: var(--radius-md);
  text-align: center;
}
.result-card:not(.used) {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}
.result-card.used {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}
.result-card h3 {
  font-size: 1rem;
  margin-bottom: 4px;
}
.result-prize {
  font-weight: 700;
}
.prizes-list {
  display: grid;
  gap: 6px;
}
.prize-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}
.prize-row.hit {
  outline: 2px solid var(--color-success);
  background: #f0fdf4;
  color: #166534;
  font-weight: 700;
}
.prize-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.prize-chance {
  margin-left: auto;
  font-size: 0.75rem;
}
.back-btn {
  justify-content: center;
}
@media (max-width: 720px) {
  .spin-layout {
    grid-template-columns: 1fr;
    gap: 28px;
  }
  .wheel {
    width: 260px;
    height: 260px;
  }
}
</style>
