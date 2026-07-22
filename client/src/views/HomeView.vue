<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { recommendationsService, dealsService, http } from '../services/api'
import { formatVND } from '../utils/currency'
import type { Deal } from '../types'

const router = useRouter()

const recommendedDeals = ref<Deal[]>([])
const flashDeals = ref<Deal[]>([])
const currentBanner = ref(0)
let bannerTimer: number | undefined
const flashSaleEnd = ref(0)
let flashTimer: number | undefined

const categories = [
  { id: 'food', name: 'Food', icon: '🍔', color: '#fff3e0' },
  { id: 'drinks', name: 'Drinks', icon: '🥤', color: '#e3f2fd' },
  { id: 'bakery', name: 'Bakery', icon: '🥐', color: '#fff8e1' },
  { id: 'grocery', name: 'Grocery', icon: '🛒', color: '#e8f5e9' },
  { id: 'asian', name: 'Asian', icon: '🍜', color: '#fce4ec' },
  { id: 'western', name: 'Western', icon: '🍕', color: '#fff3e0' },
  { id: 'dessert', name: 'Dessert', icon: '🍰', color: '#f3e5f5' },
  { id: 'healthy', name: 'Healthy', icon: '🥗', color: '#e8f5e9' },
]

const banners = [
  { image: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=800&q=80', title: 'Big Discounts Today', subtitle: 'Up to 70% off on grocery items', color: 'linear-gradient(135deg, #ee4d2d, #ff6f00)' },
  { image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80', title: 'Snack Deals', subtitle: 'Stock up on your favorites', color: 'linear-gradient(135deg, #00b14f, #00e676)' },
  { image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=800&q=80', title: 'Drinks & Beverages', subtitle: 'Cool down with great offers', color: 'linear-gradient(135deg, #3b82f6, #6366f1)' },
]

const FOOD_IMGS = [
  'https://images.unsplash.com/photo-1586999768265-24af89630739?w=400&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
  'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80',
  'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400&q=80',
  'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=400&q=80',
]

const flashCountdown = computed(() => {
  const h = Math.floor(flashSaleEnd.value / 3600)
  const m = Math.floor((flashSaleEnd.value % 3600) / 60)
  const s = flashSaleEnd.value % 60
  return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0')
})

onMounted(async () => {
  await loadDeals()
  bannerTimer = window.setInterval(() => { currentBanner.value = (currentBanner.value + 1) % banners.length }, 4000)
  flashTimer = window.setInterval(() => { if (flashSaleEnd.value > 0) flashSaleEnd.value-- }, 1000)
})

onUnmounted(() => {
  if (bannerTimer) window.clearInterval(bannerTimer)
  if (flashTimer) window.clearInterval(flashTimer)
})

async function loadDeals() {
  try {
    const [recs, all, flash] = await Promise.all([
      recommendationsService.getRecommendations({ limit: 8 }),
      dealsService.findAll({ limit: 20, status: 'active', sort: 'discount' }),
      http.get('/recommendations/flash-sale'),
    ])
    recommendedDeals.value = (recs.recommendations || []).map((deal: any) => ({
      ...deal, images: deal.images?.length ? deal.images : [FOOD_IMGS[Math.floor(Math.random() * FOOD_IMGS.length)]],
    }))
    flashDeals.value = (all.deals || []).slice(0, 8).map((deal: any) => ({
      ...deal, images: deal.images?.length ? deal.images : [FOOD_IMGS[Math.floor(Math.random() * FOOD_IMGS.length)]],
    }))
    const endTime = new Date(flash.data.endTime).getTime()
    flashSaleEnd.value = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
  } catch {
    recommendedDeals.value = []; flashDeals.value = []; flashSaleEnd.value = 0
  }
}

function selectCategory(id: string) { router.push('/explore?category=' + id) }
function distanceLabel(deal: any) {
  if (deal.distanceKm === undefined || deal.distanceKm === null) return ''
  return deal.distanceKm < 1 ? Math.round(deal.distanceKm * 1000) + 'm' : deal.distanceKm.toFixed(1) + 'km'
}
function discountPercent(deal: any) {
  if (!deal.originalPrice || !deal.discountPrice) return 0
  return Math.round((1 - deal.discountPrice / deal.originalPrice) * 100)
}
function dealRating(deal: any) {
  return Math.min(5, Math.round((3.5 + ((deal.likeCount || 0) / 20)) * 10) / 10)
}
</script>

<template>
  <div class="home-page">
    <div class="top-bar">
      <div class="location-row">
        <router-link to="/explore" class="location-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span class="location-text">Deliver to</span>
          <span class="location-addr">Home</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
        </router-link>
      </div>
      <div class="search-bar" @click="router.push('/explore')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span class="search-placeholder">Search food, stores near you...</span>
      </div>
    </div>

    <section class="banner-section">
      <div class="banner-carousel">
        <div v-for="(banner, i) in banners" :key="i" class="banner-slide" :class="{ active: currentBanner === i }" :style="{ background: banner.color }">
          <div class="banner-content">
            <h2 class="banner-title">{{ banner.title }}</h2>
            <p class="banner-subtitle">{{ banner.subtitle }}</p>
            <router-link to="/explore" class="banner-cta">Shop Now</router-link>
          </div>
          <div class="banner-image-wrapper">
            <img :src="banner.image" :alt="banner.title" class="banner-image" loading="lazy" />
          </div>
        </div>
      </div>
      <div class="banner-dots">
        <button v-for="(_, i) in banners" :key="i" class="banner-dot" :class="{ active: currentBanner === i }" @click="currentBanner = i" />
      </div>
    </section>

    <section class="category-section">
      <div class="cat-scroll">
        <button v-for="cat in categories" :key="cat.id" class="cat-item" @click="selectCategory(cat.id)">
          <div class="cat-icon" :style="{ background: cat.color }"><span class="cat-emoji">{{ cat.icon }}</span></div>
          <span class="cat-name">{{ cat.name }}</span>
        </button>
      </div>
    </section>

    <section class="flash-section">
      <div class="flash-header">
        <div class="flash-header-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#ee4d2d"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <h2 class="flash-title">Flash Sale</h2>
          <span class="flash-end-label">Ends in</span>
          <div class="flash-countdown">
            <span class="cd-num">{{ flashCountdown.slice(0,2) }}</span><span class="cd-sep">:</span>
            <span class="cd-num">{{ flashCountdown.slice(3,5) }}</span><span class="cd-sep">:</span>
            <span class="cd-num">{{ flashCountdown.slice(6,8) }}</span>
          </div>
        </div>
        <router-link to="/explore?sort=discount" class="flash-view-all">View All</router-link>
      </div>
      <div v-if="flashDeals.length" class="flash-scroll">
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
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>{{ dealRating(deal) }}</span>
              <span v-if="distanceLabel(deal)">{{ distanceLabel(deal) }}</span>
            </div>
          </div>
        </router-link>
      </div>
      <div v-else class="flash-scroll">
        <div v-for="i in 4" :key="i" class="flash-skeleton"></div>
      </div>
    </section>

    <section class="rec-section">
      <div class="rec-header">
        <h2 class="section-title">Recommended for you</h2>
        <router-link to="/explore" class="section-link">View All</router-link>
      </div>
      <div v-if="recommendedDeals.length === 0" class="rec-grid">
        <div v-for="i in 4" :key="i" class="rec-skeleton"></div>
      </div>
      <div v-else class="rec-grid">
        <router-link v-for="deal in recommendedDeals" :key="deal.id" :to="'/deals/' + deal.id" class="rec-card">
          <div class="rec-card-img">
            <img :src="deal.images?.[0] || FOOD_IMGS[0]" :alt="deal.title" loading="lazy" />
            <span v-if="discountPercent(deal) > 0" class="rec-discount-badge">-{{ discountPercent(deal) }}%</span>
            <span v-if="deal.verified" class="rec-verified-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </span>
          </div>
          <div class="rec-card-body">
            <div class="rec-store">{{ deal.store?.name || 'Store' }}</div>
            <h3 class="rec-title">{{ deal.title }}</h3>
            <div class="rec-rating-row">
              <div class="rec-stars">
                <svg v-for="n in 5" :key="n" width="10" height="10" viewBox="0 0 24 24" :fill="n <= Math.round(dealRating(deal)) ? '#f59e0b' : '#d1d5db'"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <span class="rec-rating-text">{{ dealRating(deal) }}</span>
              <span v-if="distanceLabel(deal)" class="rec-dot"></span>
              <span v-if="distanceLabel(deal)" class="rec-distance">{{ distanceLabel(deal) }}</span>
            </div>
            <div class="rec-price-row">
              <span class="rec-price">{{ formatVND(deal.discountPrice) }}</span>
              <span v-if="deal.originalPrice > deal.discountPrice" class="rec-original">{{ formatVND(deal.originalPrice) }}</span>
            </div>
          </div>
        </router-link>
      </div>
    </section>
    <div class="bottom-spacer"></div>
  </div>
</template>

<style scoped>
.home-page { max-width: 1200px; margin: 0 auto; padding: 0 20px 80px; }

/* ── Top bar ────────────────────────────────────────── */
.top-bar { padding: 16px 0 8px; display: flex; flex-direction: column; gap: 12px; }
.location-row { display: flex; align-items: center; }
.location-btn { display: flex; align-items: center; gap: 6px; color: var(--color-text); text-decoration: none; font-size: 0.8125rem; font-weight: 600; padding: 4px 0; }
.location-text { color: var(--color-text-tertiary); font-weight: 400; }
.location-addr { font-weight: 600; }
.search-bar { display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-radius: var(--radius-lg); background: var(--color-bg-secondary); border: 1.5px solid var(--color-border); cursor: pointer; transition: all var(--transition-fast); }
.search-bar:hover { border-color: var(--color-accent); box-shadow: 0 0 0 4px rgba(238,77,45,0.06); }
.search-bar svg { flex-shrink: 0; color: var(--color-text-tertiary); }
.search-placeholder { color: var(--color-text-tertiary); font-size: 0.875rem; }

/* ── Banner ─────────────────────────────────────────── */
.banner-section { padding: 16px 0 4px; }
.banner-carousel { position: relative; border-radius: var(--radius-lg); overflow: hidden; height: 150px; }
.banner-slide { position: absolute; inset: 0; display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; opacity: 0; transition: opacity 0.5s ease; pointer-events: none; }
.banner-slide.active { opacity: 1; pointer-events: all; }
.banner-content { flex: 1; color: white; z-index: 1; }
.banner-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 4px; line-height: 1.2; letter-spacing: -0.02em; }
.banner-subtitle { font-size: 0.8125rem; opacity: 0.9; margin-bottom: 12px; }
.banner-cta { display: inline-flex; padding: 6px 18px; background: rgba(255,255,255,0.2); color: white; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 600; text-decoration: none; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2); transition: all var(--transition-fast); }
.banner-cta:hover { background: rgba(255,255,255,0.35); transform: translateY(-1px); }
.banner-image-wrapper { width: 110px; height: 110px; border-radius: 50%; overflow: hidden; flex-shrink: 0; border: 3px solid rgba(255,255,255,0.3); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
.banner-image { width: 100%; height: 100%; object-fit: cover; }
.banner-dots { display: flex; justify-content: center; gap: 8px; margin-top: 12px; }
.banner-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-banner-indicator); border: none; cursor: pointer; padding: 0; transition: all var(--transition-fast); }
.banner-dot.active { width: 24px; border-radius: 4px; background: var(--color-accent); }

/* ── Categories ─────────────────────────────────────── */
.category-section { padding: 16px 0 4px; }
.cat-scroll { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
.cat-scroll::-webkit-scrollbar { display: none; }
.cat-item { display: flex; flex-direction: column; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; padding: 4px 0; flex-shrink: 0; transition: all var(--transition-fast); }
.cat-icon { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: all var(--transition-fast); }
.cat-item:hover .cat-icon { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0,0,0,0.1); }
.cat-item:active .cat-icon { transform: scale(0.92); }
.cat-emoji { font-size: 1.5rem; }
.cat-name { font-size: 0.75rem; font-weight: 500; color: var(--color-text-secondary); white-space: nowrap; }

/* ── Flash Sale ─────────────────────────────────────── */
.flash-section { padding: 12px 0; }
.flash-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.flash-header-left { display: flex; align-items: center; gap: 10px; }
.flash-title { font-size: 1.1rem; font-weight: 700; color: var(--color-accent); }
.flash-end-label { font-size: 0.75rem; color: var(--color-text-tertiary); font-weight: 500; }
.flash-countdown { display: flex; align-items: center; gap: 3px; }
.cd-num { font-size: 0.875rem; font-weight: 700; color: white; background: var(--color-countdown-bg); padding: 4px 7px; border-radius: 6px; font-family: 'Inter', monospace; min-width: 26px; text-align: center; letter-spacing: 0.02em; }
.cd-sep { font-size: 0.875rem; font-weight: 700; color: var(--color-text); }
.flash-view-all { font-size: 0.8125rem; font-weight: 600; color: var(--color-accent); text-decoration: none; display: flex; align-items: center; gap: 4px; }
.flash-view-all:hover { text-decoration: underline; }
.flash-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
.flash-scroll::-webkit-scrollbar { display: none; }
.flash-card { flex-shrink: 0; width: 155px; background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; text-decoration: none; box-shadow: var(--shadow-sm); transition: all var(--transition-base); }
.flash-card:hover { box-shadow: var(--shadow-card-hover); transform: translateY(-3px); }
.flash-card:active { transform: scale(0.96); }
.flash-card-img { position: relative; height: 140px; overflow: hidden; background: var(--color-bg-tertiary); }
.flash-card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
.flash-card:hover .flash-card-img img { transform: scale(1.05); }
.flash-discount-badge { position: absolute; top: 8px; left: 8px; padding: 4px 10px; background: var(--color-accent); color: white; font-size: 0.8125rem; font-weight: 700; border-radius: 6px; box-shadow: 0 2px 8px rgba(238,77,45,0.3); }
.flash-card-body { padding: 12px; }
.flash-card-title { font-size: 0.875rem; color: var(--color-text); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; }
.flash-card-store { font-size: 0.7rem; color: var(--color-text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px; }
.flash-card-price-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.flash-card-price { font-size: 0.9375rem; font-weight: 700; color: var(--color-accent); }
.flash-card-original { font-size: 0.7rem; color: var(--color-text-tertiary); text-decoration: line-through; }
.flash-card-rating { display: flex; align-items: center; gap: 4px; font-size: 0.7rem; color: var(--color-text-tertiary); font-weight: 500; }
.flash-skeleton { flex-shrink: 0; width: 155px; height: 230px; border-radius: 12px; background: var(--color-bg-tertiary); animation: pulse 1.5s ease-in-out infinite; }

/* ── Recommended ────────────────────────────────────── */
.rec-section { padding: 20px 0 0; }
.rec-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.rec-header .section-title { font-size: 1.1rem; font-weight: 700; color: var(--color-text); }
.rec-header .section-link { font-size: 0.8125rem; font-weight: 600; color: var(--color-accent); text-decoration: none; display: flex; align-items: center; gap: 4px; }
.rec-header .section-link:hover { text-decoration: underline; }
.rec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.rec-skeleton { height: 290px; border-radius: 14px; background: var(--color-bg-tertiary); animation: pulse 1.5s ease-in-out infinite; }
.rec-card { display: flex; flex-direction: column; background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 14px; overflow: hidden; text-decoration: none; box-shadow: var(--shadow-card); transition: all var(--transition-base); }
.rec-card:hover { box-shadow: var(--shadow-card-hover); transform: translateY(-4px); }
.rec-card:active { transform: scale(0.97); }
.rec-card-img { position: relative; height: 160px; overflow: hidden; background: var(--color-bg-tertiary); }
.rec-card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
.rec-card:hover .rec-card-img img { transform: scale(1.06); }
.rec-discount-badge { position: absolute; top: 10px; left: 10px; padding: 4px 12px; background: var(--color-accent); color: white; font-size: 0.8125rem; font-weight: 700; border-radius: 6px; box-shadow: 0 2px 8px rgba(238,77,45,0.3); }
.rec-verified-badge { position: absolute; top: 10px; right: 10px; display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; background: var(--color-success); color: white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.rec-card-body { padding: 14px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
.rec-store { font-size: 0.7rem; color: var(--color-text-tertiary); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
.rec-title { font-size: 0.9375rem; font-weight: 600; color: var(--color-text); line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rec-rating-row { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.rec-stars { display: flex; gap: 1px; }
.rec-rating-text { font-size: 0.75rem; font-weight: 600; color: var(--color-rating); }
.rec-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--color-text-tertiary); }
.rec-distance { font-size: 0.75rem; color: var(--color-text-tertiary); }
.rec-price-row { display: flex; align-items: center; gap: 8px; margin-top: auto; padding-top: 8px; }
.rec-price { font-size: 1.125rem; font-weight: 700; color: var(--color-accent); letter-spacing: -0.02em; }
.rec-original { font-size: 0.75rem; color: var(--color-text-tertiary); text-decoration: line-through; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

@media (min-width: 768px) {
  .home-page { padding: 0 32px 48px; }
  .banner-carousel { height: 200px; border-radius: var(--radius-xl); }
  .banner-image-wrapper { width: 140px; height: 140px; }
  .cat-scroll { justify-content: center; }
  .rec-grid { grid-template-columns: repeat(4, 1fr); }
}
</style>
