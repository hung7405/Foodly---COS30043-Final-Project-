<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

export interface TimelineStep {
  key: string
  label: string
  hint?: string
}

const props = defineProps<{
  steps: TimelineStep[]
  currentIndex?: number
  state?: 'active' | 'completed' | 'cancelled' | 'expired'
  expiresAt?: string
  showCountdown?: boolean
}>()

const now = ref(Date.now())
let timer: number | undefined

watch(
  () => props.expiresAt,
  (expiresAt) => {
    if (props.showCountdown !== false && expiresAt) {
      if (timer) window.clearInterval(timer)
      timer = window.setInterval(() => {
        now.value = Date.now()
      }, 1000)
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})

const countdownText = computed(() => {
  if (!props.expiresAt) return ''
  const diff = Math.max(Math.floor((new Date(props.expiresAt).getTime() - now.value) / 1000), 0)
  const m = Math.floor(diff / 60)
  const s = diff % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

const countdownCritical = computed(() => {
  if (!props.expiresAt) return false
  return Math.max(new Date(props.expiresAt).getTime() - now.value, 0) < 180000
})
</script>

<template>
  <div class="order-timeline" :class="`state-${state || 'active'}`" role="list" aria-label="Order status timeline">
    <div class="countdown-chip" v-if="showCountdown !== false && expiresAt && state === 'active'">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span
        >Hold ends in <strong :class="{ critical: countdownCritical }">{{ countdownText }}</strong></span
      >
    </div>

    <ol class="timeline-steps">
      <li
        v-for="(step, i) in steps"
        :key="step.key"
        class="timeline-step"
        :class="{
          done: i < (currentIndex || 0),
          current: i === (currentIndex || 0),
          ended: (state === 'cancelled' || state === 'expired') && i >= (currentIndex || 0),
        }"
        role="listitem"
      >
        <div class="step-indicator" :aria-hidden="true">
          <span v-if="i < (currentIndex || 0)" class="step-check">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span v-else-if="state === 'cancelled' || state === 'expired'" class="step-x">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </span>
          <span v-else class="step-dot"></span>
        </div>
        <div class="step-content">
          <span class="step-label">{{ step.label }}</span>
          <span v-if="step.hint" class="step-hint">{{ step.hint }}</span>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.order-timeline {
  width: 100%;
}
.countdown-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--color-accent-light);
  color: var(--color-accent);
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 14px;
  animation: fade-slide-in 0.4s ease;
}
.countdown-chip strong {
  font-weight: 800;
}
.countdown-chip strong.critical {
  color: var(--color-error);
  animation: pulse-soft 1s ease infinite;
}
.timeline-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.timeline-step {
  display: flex;
  gap: 14px;
  position: relative;
  padding-bottom: 22px;
}
.timeline-step:last-child {
  padding-bottom: 0;
}
.timeline-step:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 9px;
  top: 22px;
  bottom: 0;
  width: 2px;
  background: var(--color-border);
  border-radius: 2px;
  transition: background 0.4s ease;
}
.timeline-step.done:not(:last-child)::before {
  background: var(--color-accent);
}
.timeline-step.ended:not(:last-child)::before {
  background: var(--color-error);
}

.step-indicator {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-check,
.step-x {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  animation: pop-in 0.3s ease;
}
.step-check {
  background: var(--color-accent);
}
.step-x {
  background: var(--color-error);
}
.step-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-card-bg);
  border: 2.5px solid var(--color-border);
}
.timeline-step.current .step-dot {
  border-color: var(--color-accent);
  background: var(--color-accent);
  box-shadow: 0 0 0 0 rgba(238, 77, 45, 0.5);
  animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
}
.timeline-step.ended .step-dot {
  border-color: var(--color-error);
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 1px;
}
.step-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  transition: color 0.3s ease;
}
.timeline-step.done .step-label,
.timeline-step.current .step-label {
  color: var(--color-text);
}
.step-hint {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

@keyframes ping {
  0% {
    box-shadow: 0 0 0 0 rgba(238, 77, 45, 0.5);
  }
  75%,
  100% {
    box-shadow: 0 0 0 9px rgba(238, 77, 45, 0);
  }
}
@keyframes pop-in {
  0% {
    transform: scale(0.4);
  }
  80% {
    transform: scale(1.12);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes fade-slide-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes pulse-soft {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}
</style>
