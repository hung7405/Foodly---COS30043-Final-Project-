<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { recommendationsService, dealsService, http } from '../services/api'
import BannerCarousel from '../components/BannerCarousel.vue'
import { formatVND } from '../utils/currency'
import type { Deal } from '../types'

const router = useRouter()

const recommendedDeals = ref<Deal[]>([])
const flashDeals = ref<Deal[]>([])
const surpriseDeals = ref<Deal[]>([])
const flashSaleEnd = ref(0)
let flashTimer: number | undefined
const loading = ref(true)
const loadError = ref('')

const categories = [
  {
    id: 'food',
    name: 'Food',
    color: '#fff3e0',
    icon: '<path d="M8 1v8a4 4 0 0 1-8 0V1h2v8h1V1h2v8h1V1h2z"/><path d="M6 13v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8h3z"/>',
  },
  {
    id: 'drinks',
    name: 'Drinks',
    color: '#e3f2fd',
    icon: '<path d="M8 2v5l-3 8v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3L13 7V2"/><path d="M4 2h8"/><path d="M8 8v8"/>',
  },
  {
    id: 'bakery',
    name: 'Bakery',
    color: '#fff8e1',
    icon: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M12 6V3"/><path d="M8 6a4 4 0 0 1 8 0"/>',
  },
  {
    id: 'grocery',
    name: 'Grocery',
    color: '#e8f5e9',
    icon: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
  },
  {
    id: 'asian',
    name: 'Asian',
    color: '#fce4ec',
    icon: '<path d="M12 3v9"/><path d="M12 12a5 5 0 0 1-5 5c0-3 2-5 5-5z"/><path d="M12 12a5 5 0 0 0 5 5c0-3-2-5-5-5z"/><path d="M5 21h14"/>',
  },
  {
    id: 'western',
    name: 'Western',
    color: '#fff3e0',
    icon: '<path d="M12 3c-2 0-3.5 1.5-3.5 3.5S10 10 12 10s3.5-1.5 3.5-3.5S14 3 12 3z"/><path d="M12 10v11"/><path d="M8 21h8"/><path d="M12 10a3 3 0 0 1-3 3"/><path d="M12 10a3 3 0 0 0 3 3"/>',
  },
  {
    id: 'dessert',
    name: 'Dessert',
    color: '#f3e5f5',
    icon: '<path d="M12 2v4"/><path d="M4 6h16"/><path d="M6 6l2 16h8l2-16"/><path d="M9 10l3 3 3-3"/>',
  },
  {
    id: 'healthy',
    name: 'Healthy',
    color: '#e8f5e9',
    icon: '<path d="M12 3a4 4 0 0 0-4 4c0 2 1 3 2 4v10h4V11c1-1 2-2 2-4a4 4 0 0 0-4-4z"/><path d="M12 3c2 0 3 1 3 3"/>',
  },
]

const FOOD_IMGS = [
  'https://images.unsplash.com/photo-1586999768265-24af89630739?w=400&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
  'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80',
  'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400&q=80',
  'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=400&q=80',
]

const HERO_WORDS = ['AI-powered discovery', 'real-time rescue maps', 'smart savings', 'zero-waste picks']
const rotatingWord = ref(HERO_WORDS[0])
const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let wordTimer: number | undefined
let revealObserver: IntersectionObserver | undefined

const stats = ref([
  { label: 'Meals rescued', value: 12400, suffix: '+' },
  { label: 'Partner stores', value: 33, suffix: '' },
  { label: 'Active deals', value: 109, suffix: '' },
  { label: 'Avg. savings', value: 60, suffix: '%' },
])
const statDisplays = ref<string[]>(stats.value.map((s) => '0' + s.suffix))

const features = [
  {
    title: 'AI Vision Search',
    desc: 'Snap a photo and find matching deals',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="4"/></svg>',
  },
  {
    title: 'Real-Time Map',
    desc: 'Live deal markers as they update',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  },
  {
    title: 'Smart Reservations',
    desc: 'Hold items before they sell out',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  },
  {
    title: 'Live Analytics',
    desc: 'Merchant intelligence in real time',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20v-8M10 20V4M16 20v-6M22 20H2"/></svg>',
  },
]

function animateStats() {
  if (prefersReducedMotion) {
    statDisplays.value = stats.value.map((s) => s.value.toLocaleString() + s.suffix)
    return
  }
  const duration = 1400
  const start = performance.now()
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    statDisplays.value = stats.value.map((s) => Math.round(s.value * eased).toLocaleString() + s.suffix)
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

function startWordRotator() {
  if (prefersReducedMotion) return
  let i = 0
  wordTimer = window.setInterval(() => {
    i = (i + 1) % HERO_WORDS.length
    rotatingWord.value = HERO_WORDS[i]
  }, 2400)
}

function initReveal() {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-revealed'))
    return
  }
  revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed')
          revealObserver?.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.12 },
  )
  els.forEach((el) => revealObserver?.observe(el))
}

const flashCountdown = computed(() => {
  const h = Math.floor(flashSaleEnd.value / 3600)
  const m = Math.floor((flashSaleEnd.value % 3600) / 60)
  const s = flashSaleEnd.value % 60
  return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0')
})

onMounted(async () => {
  await loadDeals()
  animateStats()
  startWordRotator()
  initReveal()
  flashTimer = window.setInterval(() => {
    if (flashSaleEnd.value > 0) flashSaleEnd.value--
  }, 1000)
})

onUnmounted(() => {
  if (flashTimer) window.clearInterval(flashTimer)
  if (wordTimer) window.clearInterval(wordTimer)
  revealObserver?.disconnect()
})

async function loadDeals() {
  loading.value = true
  loadError.value = ''
  try {
    const [recs, all, flash] = await Promise.all([
      recommendationsService.getRecommendations({ limit: 8 }),
      dealsService.findAll({ limit: 20, status: 'active', sort: 'discount' }),
      http.get('/recommendations/flash-sale'),
    ])
    recommendedDeals.value = (recs.recommendations || []).map((deal: any) => ({
      ...deal,
      images: deal.images?.length ? deal.images : [FOOD_IMGS[Math.floor(Math.random() * FOOD_IMGS.length)]],
    }))
    flashDeals.value = (all.deals || []).slice(0, 8).map((deal: any) => ({
      ...deal,
      images: deal.images?.length ? deal.images : [FOOD_IMGS[Math.floor(Math.random() * FOOD_IMGS.length)]],
    }))
    const endTime = new Date(flash.data.endTime).getTime()
    flashSaleEnd.value = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
    surpriseDeals.value = (all.deals || [])
      .filter(
        (deal: any) =>
          (deal.tags || []).includes('surprise') ||
          deal.metadata?.surpriseBag === true ||
          deal.metadata?.surprise_bag === true
      )
      .slice(0, 4)
    if (surpriseDeals.value.length === 0) {
      const fallback = await dealsService.findAll({ limit: 50 })
      surpriseDeals.value = ((fallback.deals || fallback) as Deal[])
        .filter(
          (deal: any) =>
            (deal.tags || []).includes('surprise') ||
            deal.metadata?.surpriseBag === true ||
            deal.metadata?.surprise_bag === true
        )
        .slice(0, 4)
    }
  } catch {
    recommendedDeals.value = []
    flashDeals.value = []
    surpriseDeals.value = []
    flashSaleEnd.value = 0
    loadError.value = 'Could not load deals. Please try again.'
  } finally {
    loading.value = false
  }
}

function selectCategory(id: string) {
  router.push('/explore?category=' + id)
}
function distanceLabel(deal: any) {
  if (deal.distanceKm === undefined || deal.distanceKm === null) return ''
  return deal.distanceKm < 1 ? Math.round(deal.distanceKm * 1000) + 'm' : deal.distanceKm.toFixed(1) + 'km'
}
function discountPercent(deal: any) {
  if (!deal.originalPrice || !deal.discountPrice) return 0
  return Math.round((1 - deal.discountPrice / deal.originalPrice) * 100)
}
function dealRating(deal: any) {
  return Math.min(5, Math.round((3.5 + (deal.likeCount || 0) / 20) * 10) / 10)
}
</script>

<template>
  <div class="home-page">
    <section class="landing-hero" aria-label="Foodly — intelligent food commerce">
      <div class="hero-blob hero-blob--1" aria-hidden="true"></div>
      <div class="hero-blob hero-blob--2" aria-hidden="true"></div>
      <div class="hero-blob hero-blob--3" aria-hidden="true"></div>
      <div class="row g-4 align-items-center hero-row">
        <div class="col-12 col-lg-6">
          <span class="hero-badge hero-anim" style="--anim-delay: 0ms">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.3L12 16.6l-6.2 4.6 2.4-7.3L2 9.4h7.6z" />
            </svg>
            Intelligent Food Commerce Platform
          </span>
          <h1 class="hero-title">
            <span class="visually-hidden"
              >Rescue fresh food with AI-powered discovery, real-time rescue maps, and smart savings.</span
            >
            <span aria-hidden="true">Rescue fresh food with<br /><span class="word-rotator">{{ rotatingWord }}</span></span>
          </h1>
          <p class="hero-sub">
            Foodly finds discounted near-expiry food from local stores with AI vision search, reserves it in
            real time, and rescues it before it goes to waste.
          </p>
          <div class="hero-cta-row hero-anim" style="--anim-delay: 200ms">
            <router-link to="/explore" class="btn hero-cta hero-cta--primary">Explore deals</router-link>
            <router-link to="/ai-search" class="btn hero-cta hero-cta--ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Try AI vision search
            </router-link>
          </div>
          <dl class="hero-stats">
            <div v-for="(s, i) in stats" :key="s.label" class="hero-stat">
              <dt class="hero-stat-label">{{ s.label }}</dt>
              <dd class="hero-stat-num">
                <span aria-hidden="true">{{ statDisplays[i] }}</span>
                <span class="visually-hidden">{{ s.value.toLocaleString() + s.suffix }}</span>
              </dd>
            </div>
          </dl>
        </div>
        <div class="col-12 col-lg-6">
          <div class="hero-visual" aria-hidden="true">
            <img class="hero-food hero-food--1" src="/img/hero-1.jpg" alt="" decoding="async" fetchpriority="high" width="168" height="168" />
            <img class="hero-food hero-food--2" src="/img/hero-2.jpg" alt="" loading="lazy" decoding="async" width="168" height="168" />
            <img class="hero-food hero-food--3" src="/img/hero-3.jpg" alt="" loading="lazy" decoding="async" width="168" height="168" />
            <div class="hero-chip hero-chip--ai">AI matched</div>
            <div class="hero-chip hero-chip--discount">-70% fresh</div>
          </div>
        </div>
      </div>
    </section>

    <section class="feature-strip" aria-label="Platform capabilities">
      <div class="row g-3">
        <div
          v-for="(f, i) in features"
          :key="f.title"
          class="col-6 col-lg-3"
          data-reveal
          :style="{ '--reveal-delay': i * 90 + 'ms' }"
        >
          <div class="feature-card">
            <div class="feature-icon" v-html="f.icon" aria-hidden="true"></div>
            <div>
              <p class="feature-title">{{ f.title }}</p>
              <p class="feature-desc">{{ f.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="loadError" class="home-error-bar">
      <span>{{ loadError }}</span>
      <button @click="loadDeals">Retry</button>
    </div>
    <div class="top-bar">
      <div class="location-row">
        <router-link to="/explore" class="location-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span class="location-text">Deliver to</span>
          <span class="location-addr">Home</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z" /></svg>
        </router-link>
      </div>
      <div class="search-bar" @click="router.push('/explore')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span class="search-placeholder">Search food, stores near you...</span>
      </div>
    </div>

    <BannerCarousel />

    <section class="category-section">
      <div class="cat-scroll">
        <button v-for="cat in categories" :key="cat.id" class="cat-item" @click="selectCategory(cat.id)">
          <div class="cat-icon" :style="{ background: cat.color }">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#b45309"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              v-html="cat.icon"
            ></svg>
          </div>
          <span class="cat-name">{{ cat.name }}</span>
        </button>
      </div>
    </section>

    <section class="flash-section">
      <div class="flash-header">
        <div class="flash-header-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#ee4d2d">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <h2 class="flash-title">Flash Sale</h2>
          <span class="flash-end-label">Ends in</span>
          <div class="flash-countdown">
            <span class="cd-num">{{ flashCountdown.slice(0, 2) }}</span
            ><span class="cd-sep">:</span> <span class="cd-num">{{ flashCountdown.slice(3, 5) }}</span
            ><span class="cd-sep">:</span>
            <span class="cd-num">{{ flashCountdown.slice(6, 8) }}</span>
          </div>
        </div>
        <router-link to="/explore?sort=discount" class="flash-view-all">View All</router-link>
      </div>
      <div v-if="loading" class="flash-scroll">
        <div v-for="i in 4" :key="i" class="flash-skeleton"></div>
      </div>
      <div v-else-if="flashDeals.length" class="flash-scroll">
        <router-link v-for="deal in flashDeals" :key="deal.id" :to="'/deals/' + deal.id" class="flash-card">
          <div class="flash-card-img">
            <img :src="deal.images?.[0] || FOOD_IMGS[0]" :alt="deal.title" loading="lazy" />
            <span class="flash-discount-badge">-{{ discountPercent(deal) }}%</span>
          </div>
          <div class="flash-card-body">
            <p class="flash-card-title">{{ deal.title }}</p>
            <p class="flash-card-store">{{ deal.store?.name || 'Store' }}</p>
            <div class="flash-card-price-row">
              <span class="flash-card-price">{{ formatVND(deal.discountPrice) }}</span>
              <span class="flash-card-original">{{ formatVND(deal.originalPrice) }}</span>
            </div>
            <div class="flash-card-rating">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b">
                <polygon
                  points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                />
              </svg>
              <span>{{ dealRating(deal) }}</span>
              <span v-if="distanceLabel(deal)">{{ distanceLabel(deal) }}</span>
            </div>
          </div>
        </router-link>
      </div>
      <div v-else class="flash-scroll flash-empty">
        <div v-for="i in 4" :key="i" class="flash-card flash-card--placeholder">
          <div class="flash-card-img placeholder-img"></div>
          <div class="flash-card-body">
            <div class="ph-line" style="width: 80%"></div>
            <div class="ph-line" style="width: 50%"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="surprise-section">
      <div class="surprise-header">
        <div class="surprise-title-row">
          <span class="surprise-emoji">🎁</span>
          <h2 class="section-title">Surprise Bags</h2>
          <span class="surprise-badge">New</span>
        </div>
        <router-link to="/explore?category=food" class="flash-view-all">View All</router-link>
      </div>
      <div v-if="surpriseDeals.length" class="row g-3">
        <div v-for="deal in surpriseDeals" :key="deal.id" class="col-12 col-md-6 col-lg-4">
          <router-link :to="'/deals/' + deal.id" class="rec-card surprise-card h-100">
          <div class="rec-card-img">
            <img :src="deal.images?.[0] || FOOD_IMGS[0]" :alt="deal.title" loading="lazy" />
            <span class="rec-discount-badge surprise-badge-tag">Surprise</span>
          </div>
          <div class="rec-card-body">
            <div class="rec-store">{{ deal.store?.name || 'Store' }}</div>
            <h3 class="rec-title">{{ deal.title }}</h3>
            <div class="rec-price-row">
              <span class="rec-price">{{ formatVND(deal.discountPrice) }}</span>
              <span class="surprise-value">up to {{ formatVND(deal.originalPrice) }} value</span>
            </div>
          </div>
          </router-link>
        </div>
      </div>
      <div v-else-if="!loading" class="surprise-empty">
        <p>No surprise bags right now — check back later today.</p>
        <router-link to="/explore" class="btn btn-outline btn-sm">Explore deals</router-link>
      </div>
    </section>

    <section class="spin-strip">
      <div class="spin-strip-icon">🎡</div>
      <div class="spin-strip-text">
        <strong>Daily Bonus Wheel</strong>
        <span>Spin once a day and earn free xu on every rescue.</span>
      </div>
      <router-link to="/spin" class="btn btn-primary btn-sm spin-cta">Spin now</router-link>
    </section>

    <section class="rec-section">
      <div class="rec-header">
        <h2 class="section-title">Recommended for you</h2>
        <router-link to="/explore" class="section-link">View All</router-link>
      </div>
      <div v-if="loading" class="row g-3">
        <div v-for="i in 4" :key="i" class="col-12 col-md-6 col-lg-4">
          <div class="rec-skeleton"></div>
        </div>
      </div>
      <div v-else-if="recommendedDeals.length === 0" class="row g-3">
        <div v-for="i in 4" :key="i" class="col-12 col-md-6 col-lg-4">
          <div class="rec-card rec-card--placeholder h-100">
            <div class="rec-card-img placeholder-img"></div>
            <div class="rec-card-body">
              <div class="ph-line" style="width: 40%"></div>
              <div class="ph-line" style="width: 90%"></div>
              <div class="ph-line" style="width: 60%"></div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="row g-3">
        <div v-for="deal in recommendedDeals" :key="deal.id" class="col-12 col-md-6 col-lg-4">
          <router-link :to="'/deals/' + deal.id" class="rec-card h-100">
          <div class="rec-card-img">
            <img :src="deal.images?.[0] || FOOD_IMGS[0]" :alt="deal.title" loading="lazy" />
            <span v-if="discountPercent(deal) > 0" class="rec-discount-badge">-{{ discountPercent(deal) }}%</span>
            <span v-if="deal.verified" class="rec-verified-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </span>
          </div>
          <div class="rec-card-body">
            <div class="rec-store">{{ deal.store?.name || 'Store' }}</div>
            <h3 class="rec-title">{{ deal.title }}</h3>
            <div class="rec-rating-row">
              <div class="rec-stars">
                <svg
                  v-for="n in 5"
                  :key="n"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  :fill="n <= Math.round(dealRating(deal)) ? '#f59e0b' : '#d1d5db'"
                >
                  <polygon
                    points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                  />
                </svg>
              </div>
              <span class="rec-rating-text">{{ dealRating(deal) }}</span>
              <span v-if="distanceLabel(deal)" class="rec-dot"></span>
              <span v-if="distanceLabel(deal)" class="rec-distance">{{ distanceLabel(deal) }}</span>
            </div>
            <div class="rec-price-row">
              <span class="rec-price">{{ formatVND(deal.discountPrice) }}</span>
              <span v-if="deal.originalPrice > deal.discountPrice" class="rec-original">{{
                formatVND(deal.originalPrice)
              }}</span>
            </div>
          </div>
        </router-link>
        </div>
      </div>
    </section>
    <div class="bottom-spacer"></div>
  </div>
</template>

<style scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px 80px;
}

.flash-section,
.surprise-section,
.spin-strip,
.rec-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 620px;
}

.home-error-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  margin: 12px 0 0;
  border-radius: 10px;
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
  font-size: 0.875rem;
}
.home-error-bar button {
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 5px 14px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.placeholder-img {
  background: var(--color-bg-tertiary);
}
.ph-line {
  height: 12px;
  border-radius: 6px;
  background: var(--color-bg-tertiary);
}
.flash-card--placeholder,
.rec-card--placeholder {
  pointer-events: none;
}
.rec-card--placeholder .rec-card-body {
  gap: 10px;
}

/* ── Top bar ────────────────────────────────────────── */
.top-bar {
  padding: 16px 0 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.location-row {
  display: flex;
  align-items: center;
}
.location-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text);
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 4px 0;
}
.location-text {
  color: var(--color-text-tertiary);
  font-weight: 400;
}
.location-addr {
  font-weight: 600;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
  border: 1.5px solid var(--color-border);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.search-bar:hover {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 4px rgba(238, 77, 45, 0.06);
}
.search-bar svg {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
}
.search-placeholder {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

/* ── Categories ─────────────────────────────────────── */
.category-section {
  padding: 16px 0 4px;
}
.cat-scroll {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.cat-scroll::-webkit-scrollbar {
  display: none;
}
.cat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 0;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}
.cat-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all var(--transition-fast);
}
.cat-item:hover .cat-icon {
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
}
.cat-item:active .cat-icon {
  transform: scale(0.92);
}
.cat-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

/* ── Flash Sale ─────────────────────────────────────── */
.flash-section {
  padding: 12px 0;
}
.flash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.flash-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.flash-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-accent-dark);
}
.flash-end-label {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  font-weight: 500;
}
.flash-countdown {
  display: flex;
  align-items: center;
  gap: 3px;
}
.cd-num {
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
  background: var(--color-countdown-bg);
  padding: 4px 7px;
  border-radius: 6px;
  font-family: 'Inter', monospace;
  min-width: 26px;
  text-align: center;
  letter-spacing: 0.02em;
}
.cd-sep {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text);
}
.flash-view-all {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-accent-dark);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 4px;
}
.flash-view-all:hover {
  text-decoration: underline;
}
.flash-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.flash-scroll::-webkit-scrollbar {
  display: none;
}
.flash-card {
  flex-shrink: 0;
  width: 155px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}
.flash-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-3px);
}
.flash-card:active {
  transform: scale(0.96);
}
.flash-card-img {
  position: relative;
  height: 140px;
  overflow: hidden;
  background: var(--color-bg-tertiary);
}
.flash-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}
.flash-card:hover .flash-card-img img {
  transform: scale(1.05);
}
.flash-discount-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 10px;
  background: var(--color-accent);
  color: white;
  font-size: 0.8125rem;
  font-weight: 700;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(238, 77, 45, 0.3);
}
.flash-card-body {
  padding: 12px;
}
.flash-card-title {
  font-size: 0.875rem;
  color: var(--color-text);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
}
.flash-card-store {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}
.flash-card-price-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.flash-card-price {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-accent);
}
.flash-card-original {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  text-decoration: line-through;
}
.flash-card-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  font-weight: 500;
}
.flash-skeleton {
  flex-shrink: 0;
  width: 155px;
  height: 230px;
  border-radius: 12px;
  background: var(--color-bg-tertiary);
  animation: pulse 1.5s ease-in-out infinite;
}

/* ── Surprise Bags ─────────────────────────────────── */
.surprise-section {
  padding: 20px 0 0;
}
.surprise-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.surprise-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.surprise-emoji {
  font-size: 1.2rem;
}
.surprise-section .section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
}
.surprise-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #6d28d9;
  background: #f3e8ff;
  padding: 3px 10px;
  border-radius: var(--radius-full);
}
.surprise-badge-tag {
  background: linear-gradient(135deg, #9333ea, #6366f1);
}
.surprise-card {
  border: 1.5px solid #ddd6fe;
}
.surprise-value {
  font-size: 0.7rem;
  font-weight: 600;
  color: #7c3aed;
  background: #f3e8ff;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}
.surprise-empty {
  padding: 24px;
  text-align: center;
  background: var(--color-bg-secondary);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

/* ── Spin strip ────────────────────────────────────── */
.spin-strip {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fdf4ff, #ede9fe);
  border: 1px solid #ddd6fe;
}
.spin-strip-icon {
  font-size: 1.6rem;
}
.spin-strip-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.spin-strip-text strong {
  color: #6d28d9;
  font-size: 0.9375rem;
}
.spin-strip-text span {
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
}
.spin-cta {
  flex-shrink: 0;
}

/* ── Recommended ────────────────────────────────────── */
.rec-section {
  padding: 20px 0 0;
}
.rec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.rec-header .section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
}
.rec-header .section-link {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 4px;
}
.rec-header .section-link:hover {
  text-decoration: underline;
}
.rec-skeleton {
  height: 290px;
  border-radius: 14px;
  background: var(--color-bg-tertiary);
  animation: pulse 1.5s ease-in-out infinite;
}
.rec-card {
  display: flex;
  flex-direction: column;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  overflow: hidden;
  text-decoration: none;
  box-shadow: var(--shadow-card);
  transition: all var(--transition-base);
}
.rec-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-4px);
}
.rec-card:active {
  transform: scale(0.97);
}
.rec-card-img {
  position: relative;
  height: 160px;
  overflow: hidden;
  background: var(--color-bg-tertiary);
}
.rec-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}
.rec-card:hover .rec-card-img img {
  transform: scale(1.06);
}
.rec-discount-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 12px;
  background: var(--color-accent);
  color: white;
  font-size: 0.8125rem;
  font-weight: 700;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(238, 77, 45, 0.3);
}
.rec-verified-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: var(--color-success);
  color: white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.rec-card-body {
  padding: 14px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rec-store {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.rec-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rec-rating-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.rec-stars {
  display: flex;
  gap: 1px;
}
.rec-rating-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}
.rec-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-text-tertiary);
}
.rec-distance {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}
.rec-price-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
}
.rec-price {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-accent);
  letter-spacing: -0.02em;
}
.rec-original {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  text-decoration: line-through;
}

/* ── Landing hero ─────────────────────────────────── */
.landing-hero {
  position: relative;
  overflow: hidden;
  margin-top: 10px;
  border-radius: var(--radius-xl);
  background: linear-gradient(120deg, #1a1a2e 0%, #45222e 48%, #c2410c 115%);
  color: #fff;
  padding: 40px 24px 44px;
  box-shadow: var(--shadow-lg);
}
.hero-row {
  position: relative;
  z-index: 1;
}
.hero-anim {
  animation: hero-fade-up 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
  animation-delay: var(--anim-delay, 0ms);
}
@keyframes hero-fade-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.hero-blob {
  position: absolute;
  border-radius: 50%;
  opacity: 0.4;
  z-index: 0;
  animation: hero-float 14s ease-in-out infinite;
}
.hero-blob--1 {
  width: 340px;
  height: 340px;
  background: radial-gradient(circle, rgba(255, 122, 69, 0.6), rgba(255, 122, 69, 0) 70%);
  top: -120px;
  right: -80px;
}
.hero-blob--2 {
  width: 260px;
  height: 260px;
  background: radial-gradient(circle, rgba(109, 40, 217, 0.55), rgba(109, 40, 217, 0) 70%);
  bottom: -110px;
  left: -60px;
  animation-delay: -4s;
}
.hero-blob--3 {
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.5), rgba(245, 158, 11, 0) 70%);
  top: 40%;
  left: 38%;
  animation-delay: -8s;
}
@keyframes hero-float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(24px, -18px) scale(1.08);
  }
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #ffe8dd;
}
.hero-title {
  margin: 18px 0 14px;
  font-size: clamp(1.9rem, 4.2vw, 3rem);
  font-weight: 800;
  line-height: 1.12;
  color: #fff;
  letter-spacing: -0.02em;
}
.word-rotator {
  color: #ffd9a0;
  background: linear-gradient(90deg, #ffd9a0, #ff9a76, #ffd9a0);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: word-shimmer 5s linear infinite;
}
@keyframes word-shimmer {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
}
.hero-sub {
  max-width: 520px;
  font-size: 1rem;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.82);
  margin-bottom: 22px;
}
.hero-cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 26px;
}
.hero-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.9375rem;
  text-decoration: none;
  border: 1px solid transparent;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
}
.hero-cta:hover {
  transform: translateY(-2px);
}
.hero-cta--primary {
  background: linear-gradient(135deg, #ff8a3d, #ee4d2d);
  color: #fff;
  box-shadow: 0 8px 20px rgba(238, 77, 45, 0.4);
}
.hero-cta--primary:hover {
  box-shadow: 0 10px 26px rgba(238, 77, 45, 0.5);
}
.hero-cta--ghost {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
}
.hero-cta--ghost:hover {
  background: rgba(255, 255, 255, 0.18);
}
.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 26px;
  margin: 0;
}
.hero-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hero-stat-num {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  color: #ffd9a0;
}
.hero-stat-label {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.hero-visual {
  position: relative;
  height: 320px;
}
.hero-food {
  position: absolute;
  width: 168px;
  height: 168px;
  object-fit: cover;
  border-radius: 22px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
  border: 4px solid rgba(255, 255, 255, 0.85);
  animation: hero-food-float 6s ease-in-out infinite;
}
.hero-food--1 {
  top: 12px;
  left: 6%;
  transform: rotate(-6deg);
}
.hero-food--2 {
  top: 88px;
  right: 8%;
  transform: rotate(5deg);
  animation-delay: -2s;
}
.hero-food--3 {
  bottom: 6px;
  left: 34%;
  transform: rotate(-2deg);
  animation-delay: -4s;
}
@keyframes hero-food-float {
  0%,
  100% {
    transform: translateY(0) var(--food-rotate, 0deg);
  }
  50% {
    transform: translateY(-12px) var(--food-rotate, 0deg);
  }
}
.hero-chip {
  position: absolute;
  padding: 8px 14px;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.3);
  animation: hero-food-float 5s ease-in-out infinite;
}
.hero-chip--ai {
  top: 4px;
  right: 20%;
  background: linear-gradient(135deg, #9333ea, #6366f1);
}
.hero-chip--discount {
  bottom: 14px;
  left: 2%;
  background: linear-gradient(135deg, #ff8a3d, #ee4d2d);
  animation-delay: -2.5s;
}

/* ── Feature strip ────────────────────────────────── */
.feature-strip {
  padding: 20px 0 0;
}
.feature-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  height: 100%;
  padding: 16px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}
.feature-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-card-hover);
}
.feature-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent-light);
  color: var(--color-accent);
}
.feature-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 2px;
}
.feature-desc {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  line-height: 1.45;
}

/* ── Reveal + a11y helpers ───────────────────────── */
[data-reveal] {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity 0.6s ease var(--reveal-delay, 0ms), transform 0.6s ease var(--reveal-delay, 0ms);
}
[data-reveal].is-revealed {
  opacity: 1;
  transform: none;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 991.98px) {
  .hero-visual {
    height: 240px;
    margin-top: 8px;
  }
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

@media (min-width: 768px) {
  .home-page {
    padding: 0 32px 48px;
  }
  .cat-scroll {
    justify-content: center;
  }
}
</style>
