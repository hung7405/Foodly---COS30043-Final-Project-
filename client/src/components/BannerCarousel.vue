<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'

type Banner = {
  id: number
  title: string
  subtitle: string
  cta: string
  image: string
  color: string
  promo?: string
  countdown?: boolean
}

const banners: Banner[] = [
  {
    id: 1,
    title: 'Big Discounts Today',
    subtitle: 'Up to 70% off on grocery items',
    cta: 'Shop Now',
    image: '/img/banner-1.jpg',
    color: 'linear-gradient(135deg, #ee4d2d, #ff6f00)',
    promo: '70% OFF',
  },
  {
    id: 2,
    title: 'Fresh Food, Fast',
    subtitle: 'Same-day delivery on groceries & meals',
    cta: 'Order Now',
    image: '/img/banner-2.jpg',
    color: 'linear-gradient(135deg, #16a34a, #22c55e)',
    promo: 'FREE SHIPPING',
  },
  {
    id: 3,
    title: 'Snack Deals',
    subtitle: 'Stock up on your favorites',
    cta: 'View Snacks',
    image: '/img/banner-3.jpg',
    color: 'linear-gradient(135deg, #2563eb, #4f46e5)',
    promo: 'HOT',
  },
  {
    id: 4,
    title: 'Drinks & Beverages',
    subtitle: 'Cool down with great offers',
    cta: 'Shop Drinks',
    image: '/img/banner-4.jpg',
    color: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
    countdown: true,
    promo: 'FLASH',
  },
]

const current = ref(0)
const hover = ref(false)
const interval = 5000

let timer: number | undefined
let countdownTimer: number | undefined

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const endOfDay = computed(() => {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.getTime()
})
const remaining = ref(0)

function next() {
  current.value = (current.value + 1) % banners.length
}
function prev() {
  current.value = (current.value - 1 + banners.length) % banners.length
}
function goTo(i: number) {
  current.value = i
}

function tick() {
  remaining.value = Math.max(0, Math.floor((endOfDay.value - Date.now()) / 1000))
}
const formatted = computed(() => {
  const s = remaining.value
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})

watch(current, () => {
  if (banners[current.value].countdown) {
    remaining.value = 0
    tick()
    if (countdownTimer) window.clearInterval(countdownTimer)
    countdownTimer = window.setInterval(tick, 1000)
  } else {
    if (countdownTimer) window.clearInterval(countdownTimer)
  }
})

onMounted(() => {
  if (!prefersReducedMotion()) {
    timer = window.setInterval(() => {
      if (!hover.value) next()
    }, interval)
  }
  if (banners[current.value].countdown) {
    tick()
    countdownTimer = window.setInterval(tick, 1000)
  }
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
  if (countdownTimer) window.clearInterval(countdownTimer)
})
</script>

<template>
  <section class="banner-section" role="region" aria-label="Featured offers" aria-roledescription="carousel">
    <div class="banner-viewport" @mouseenter="hover = true" @mouseleave="hover = false">
      <div
        v-for="(banner, i) in banners"
        :key="banner.id"
        class="banner-slide"
        :class="{ active: i === current }"
        :style="{ background: banner.color }"
        :aria-hidden="i !== current"
        :aria-label="banner.title"
        :data-banner-id="banner.id"
      >
        <div class="banner-progress" :class="{ active: i === current }">
          <div class="banner-progress-inner"></div>
        </div>

        <div class="banner-image-wrapper">
          <div class="banner-image-outer" :style="{ background: banner.color }">
            <img :src="banner.image" :alt="banner.title" class="banner-image" loading="eager" fetchpriority="high" width="448" height="220" />
            <div class="banner-glow"></div>
          </div>
        </div>

        <div class="banner-content">
          <div class="banner-chip" v-if="banner.promo">
            <span class="banner-chip-text">{{ banner.promo }}</span>
          </div>

          <h2 class="banner-title">{{ banner.title }}</h2>
          <p class="banner-subtitle">{{ banner.subtitle }}</p>

          <div class="banner-meta" v-if="banner.countdown">
            <span class="meta-label">Ends in</span>
            <div class="countdown">
              <span class="countdown-num">{{ formatted.slice(0, 2) }}</span>
              <span class="countdown-sep">:</span>
              <span class="countdown-num">{{ formatted.slice(3, 5) }}</span>
              <span class="countdown-sep">:</span>
              <span class="countdown-num">{{ formatted.slice(6, 8) }}</span>
            </div>
          </div>

          <nav class="banner-cta-row">
            <RouterLink to="/explore" @click="goTo(i)" class="banner-cta">{{ banner.cta }}</RouterLink>
          </nav>
        </div>
      </div>

      <button type="button" class="banner-nav banner-nav-prev" :aria-label="'Previous offer'" @click="prev">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>
      <button type="button" class="banner-nav banner-nav-next" :aria-label="'Next offer'" @click="next">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>

    <div class="banner-dots" role="group" aria-label="Carousel navigation">
      <button
        v-for="(_, i) in banners"
        :key="banners[i].id"
        type="button"
        class="banner-dot"
        :class="{ active: i === current }"
        :aria-label="'Go to slide ' + (i + 1)"
        :aria-current="i === current ? 'true' : undefined"
        @click="goTo(i)"
      />
    </div>
  </section>
</template>

<style scoped>
.banner-section {
  position: relative;
  padding: 16px 0 8px;
}

.banner-viewport {
  position: relative;
  border-radius: var(--radius-xl);
  overflow: hidden;
  height: 170px;
  outline: none;
}

.banner-slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 24px 24px 28px;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 600ms ease,
    visibility 0ms linear 600ms;
  overflow: hidden;
}

.banner-slide.active {
  opacity: 1;
  pointer-events: auto;
  transition-delay: 80ms;
}

.banner-progress {
  position: absolute;
  inset-block-start: 0;
  inline-size: 100%;
  block-size: 3px;
  background: rgba(255, 255, 255, 0.18);
  overflow: hidden;
}

.banner-progress-inner {
  block-size: 100%;
  inline-size: 100%;
  background: var(--color-accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 5000ms linear;
}

.banner-progress.active .banner-progress-inner {
  transform: scaleX(1);
}

.banner-image-wrapper {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  pointer-events: none;
  z-index: 1;
}

.banner-image-outer {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-full);
  width: 40%;
  height: 100%;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-xl);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.banner-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 900ms ease;
  z-index: 1;
}

.banner-slide.active .banner-image {
  transform: scale(1.05);
}

.banner-glow {
  position: absolute;
  inset: -10px;
  border-radius: var(--radius-full);
  background: radial-gradient(55% 55% at 30% 30%, rgba(255, 255, 255, 0.35), transparent 70%);
  z-index: 0;
  pointer-events: none;
}

.banner-content {
  position: relative;
  z-index: 2;
  color: var(--color-glass-bg);
  max-width: 52%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.banner-chip {
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: var(--radius-full);
  padding: 4px 12px;
  backdrop-filter: blur(6px);
}

.banner-chip-text {
  font: var(--font-label);
  color: #fff;
  letter-spacing: 0.04em;
}

.banner-title {
  font: 700 26px/1.1 var(--font-family);
  color: #fff;
  letter-spacing: -0.025em;
  margin: 0;
}

.banner-subtitle {
  font-size: 0.9rem;
  opacity: 0.92;
  color: #fff;
  margin: 0;
}

.banner-meta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.meta-label {
  font: var(--font-label);
  color: #fff;
  opacity: 0.85;
}

.countdown {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-family: 'Inter', monospace;
}

.countdown-num {
  font: 600 14px/1 var(--font-family);
  color: #fff;
  min-width: 22px;
  text-align: center;
}

.countdown-sep {
  font: 600 14px/1 var(--font-family);
  color: rgba(255, 255, 255, 0.75);
}

.banner-cta-row {
  margin-top: 8px;
}

.banner-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: var(--radius-full);
  font: 600 0.875rem/1 var(--font-family);
  color: #1a1a2e;
  text-decoration: none;
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.6);
  transition: all var(--transition-fast);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}

.banner-cta:hover {
  background: rgba(255, 255, 255, 0.88);
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.24);
}

.banner-nav {
  position: absolute;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.26);
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
  transition: all var(--transition-fast);
  backdrop-filter: blur(4px);
}

.banner-nav:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.08);
  border-color: rgba(255, 255, 255, 0.45);
}

.banner-nav:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.banner-nav-prev {
  inset-inline-start: 12px;
  top: 50%;
  transform: translateY(-50%);
}
.banner-nav-next {
  inset-inline-end: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.banner-dots {
  display: inline-flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.banner-dot {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.banner-dot::after {
  content: '';
  display: block;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-banner-indicator);
  transition: all var(--transition-fast);
}

.banner-dot.active::after {
  width: 24px;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
}

@media (min-width: 768px) {
  .banner-viewport {
    height: 220px;
  }
  .banner-title {
    font-size: 32px;
  }
  .banner-image-outer {
    width: 38%;
  }
}

@media (max-width: 768px) {
  .banner-slide {
    flex-direction: column;
    text-align: center;
    padding: 20px 16px 24px;
  }
  .banner-content {
    max-width: 100%;
  }
  .banner-viewport {
    height: 170px;
  }
  .banner-image-wrapper {
    justify-content: center;
    position: absolute;
    bottom: -14px;
  }
  .banner-image-outer {
    width: 120px;
    height: 120px;
    min-height: 0;
  }
  .banner-title {
    font-size: 22px;
  }
  .banner-nav {
    display: none;
  }
}
</style>
