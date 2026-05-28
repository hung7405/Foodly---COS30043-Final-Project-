<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { SITE_NAME, SITE_TAGLINE } from '../utils/constants'
import { recommendationsService } from '../services/api'
import { formatVND } from '../utils/currency'
import type { Deal } from '../types'

const recommendedDeals = ref<Deal[]>([])
const recommendationsLoading = ref(true)

const foodImages = [
  {
    src: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80',
    alt: 'Fresh vegetables at a market',
    label: 'Fresh Produce'
  },
  {
    src: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&q=80',
    alt: 'Community food sharing',
    label: 'Community Sharing'
  }
]

const FOOD_IMGS = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
  'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=80',
]

onMounted(async () => {
  try {
    const result = await recommendationsService.getRecommendations({ limit: 8 })
    recommendedDeals.value = (result.recommendations || []).map((deal: any) => ({
      ...deal,
      images: deal.images?.length ? deal.images : [FOOD_IMGS[Math.floor(Math.random() * FOOD_IMGS.length)]],
    }))
  } catch {
    recommendedDeals.value = []
  } finally {
    recommendationsLoading.value = false
  }
})

function distanceLabel(deal: any) {
  if (deal.distanceKm === undefined || deal.distanceKm === null) return ''
  return deal.distanceKm < 1 ? `${Math.round(deal.distanceKm * 1000)}m` : `${deal.distanceKm.toFixed(1)}km`
}
</script>

<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-bg" aria-hidden="true"></div>
      <div class="container">
        <div class="hero-content">
          <div class="hero-badge">
            <span class="live-dot"></span>
            Beta Now Live
          </div>
          <h1 class="hero-title">
            Discover Fresh Deals.
            <span class="hero-highlight">Near You. Now.</span>
          </h1>
          <p class="hero-description">
            {{ SITE_TAGLINE }}. Find discounted and near-expiry food near you,
            reserve instantly, and join a community committed to reducing food waste.
          </p>
          <div class="hero-actions">
            <router-link to="/explore" class="btn btn-primary btn-lg">
              Explore Deals
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </router-link>
            <router-link to="/about" class="btn btn-outline btn-lg">
              Learn More
            </router-link>
          </div>
          <div class="hero-stats">
            <div class="stat">
              <span class="stat-value">2,340+</span>
              <span class="stat-label">Deals Shared</span>
            </div>
            <div class="stat-divider" aria-hidden="true"></div>
            <div class="stat">
              <span class="stat-value">890+</span>
              <span class="stat-label">Meals Saved</span>
            </div>
            <div class="stat-divider" aria-hidden="true"></div>
            <div class="stat">
              <span class="stat-value">1.2k+</span>
              <span class="stat-label">Community Members</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Food Images Section -->
    <section class="section images-section" aria-label="Featured food images">
      <div class="container">
        <div class="images-grid">
          <div
            v-for="(image, index) in foodImages"
            :key="index"
            class="image-card"
            :style="{ animationDelay: `${index * 0.15}s` }"
          >
            <div class="image-wrapper">
              <img :src="image.src" :alt="image.alt" loading="lazy" />
              <div class="image-overlay">
                <span class="image-label">{{ image.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Introduction Section -->
    <section class="section intro-section">
      <div class="container">
        <div class="intro-content">
          <h2 class="section-title">How {{ SITE_NAME }} Works</h2>
          <p class="section-subtitle">
            We connect you with nearby stores and community members sharing discounted food
            that would otherwise go to waste. Simple, fast, and impact-driven.
          </p>
          <div class="steps-grid">
            <div class="step-card">
              <div class="step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <h3 class="step-title">Discover</h3>
              <p class="step-desc">Browse our interactive map to find deals near you. Filter by category, price, and distance.</p>
            </div>
            <div class="step-card">
              <div class="step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <h3 class="step-title">Reserve</h3>
              <p class="step-desc">Secure your item instantly with our real-time reservation system. No queues, no hassle.</p>
            </div>
            <div class="step-card">
              <div class="step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3 class="step-title">Collect</h3>
              <p class="step-desc">Pick up your reserved food at the store. Show your reservation code and enjoy your savings.</p>
            </div>
            <div class="step-card">
              <div class="step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3 class="step-title">Contribute</h3>
              <p class="step-desc">Share deals you find, verify listings, and build trust in your community.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Recommendations Section -->
    <section class="section recommendations-section">
      <div class="container">
        <div class="recommendations-header">
          <div>
            <h2 class="section-title">Gợi ý cho bạn</h2>
            <p class="section-subtitle">Deal gần bạn nhất, phù hợp với sở thích của bạn</p>
          </div>
          <router-link to="/explore" class="view-all-link">
            Xem tất cả
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </router-link>
        </div>

        <div v-if="recommendationsLoading" class="recommendations-loading">
          <div v-for="i in 4" :key="i" class="rec-skeleton"></div>
        </div>

        <div v-else-if="recommendedDeals.length === 0" class="recommendations-empty">
          <p>Chưa có gợi ý nào. Hãy khám phá bản đồ để tìm deal gần bạn!</p>
          <router-link to="/explore" class="btn btn-primary">Khám phá ngay</router-link>
        </div>

        <div v-else class="recommendations-grid">
          <router-link
            v-for="deal in recommendedDeals"
            :key="deal.id"
            :to="`/deals/${deal.id}`"
            class="rec-card"
          >
            <div class="rec-card-img">
              <img :src="deal.images?.[0] || FOOD_IMGS[0]" :alt="deal.title" loading="lazy" />
              <span v-if="deal.verified" class="rec-badge verified-badge">Đã xác thực</span>
              <span v-if="distanceLabel(deal)" class="rec-badge distance-badge">{{ distanceLabel(deal) }}</span>
            </div>
            <div class="rec-card-body">
              <h3 class="rec-title">{{ deal.title }}</h3>
              <div class="rec-price-row">
                <span class="rec-price">{{ formatVND(deal.discountPrice) }}</span>
                <span v-if="deal.originalPrice > deal.discountPrice" class="rec-original-price">{{ formatVND(deal.originalPrice) }}</span>
                <span v-if="deal.originalPrice > deal.discountPrice" class="rec-discount-pct">-{{ Math.round((1 - deal.discountPrice / deal.originalPrice) * 100) }}%</span>
              </div>
              <div class="rec-meta">
                <span v-if="deal.address" class="rec-meta-item">{{ deal.address }}</span>
                <span class="rec-meta-item">{{ deal.remainingQuantity }} còn lại</span>
              </div>
              <div class="rec-tags">
                <span v-for="tag in (deal.tags || []).slice(0, 3)" :key="tag" class="rec-tag">{{ tag }}</span>
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="section cta-section">
      <div class="container">
        <div class="cta-card">
          <div class="cta-bg" aria-hidden="true"></div>
          <h2 class="cta-title">Ready to Start Saving?</h2>
          <p class="cta-text">Join thousands of community members reducing food waste and saving money.</p>
          <router-link to="/register" class="cta-btn">
            Get Started Free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  animation: fade-in 0.5s ease;
}

.hero-section {
  padding: 120px 0 80px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 600px 400px at 30% 40%, rgba(16, 185, 129, 0.08), transparent 60%),
    radial-gradient(ellipse 500px 300px at 70% 60%, rgba(99, 102, 241, 0.06), transparent 50%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  max-width: 720px;
  margin: 0 auto;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-radius: var(--radius-full);
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 24px;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: pulse-glow 2s ease infinite;
}

.hero-title {
  font-size: 3.75rem;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.04em;
  margin-bottom: 20px;
  color: var(--color-text);
}

.hero-highlight {
  display: block;
  background: linear-gradient(135deg, var(--color-accent), #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin-bottom: 36px;
  max-width: 560px;
  margin-left: auto;
  margin-right: auto;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 56px;
}

.hero-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
  letter-spacing: -0.02em;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.stat-divider {
  width: 1px;
  height: 44px;
  background: var(--color-border);
}

.images-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.image-card {
  animation: fade-in-up 0.6s ease both;
}

.image-wrapper {
  position: relative;
  border-radius: var(--radius-md);
  overflow: hidden;
  aspect-ratio: 4/3;
  background: var(--color-bg-tertiary);
  box-shadow: var(--shadow-sm);
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.image-card:hover .image-wrapper img {
  transform: scale(1.08);
}

.image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
  background: linear-gradient(transparent 0%, rgba(0,0,0,0.7) 100%);
}

.image-label {
  color: white;
  font-weight: 600;
  font-size: 1.125rem;
  letter-spacing: -0.01em;
}

.intro-content {
  text-align: center;
  margin-bottom: 48px;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-top: 48px;
  text-align: left;
}

.step-card {
  padding: 28px 24px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.step-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
  border-color: var(--color-accent-light);
}

.step-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  background: var(--color-accent-light);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  transition: all var(--transition-base);
}

.step-card:hover .step-icon {
  background: var(--color-accent);
  color: white;
}

.step-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--color-text);
}

.step-desc {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.cta-section {
  padding-bottom: 80px;
}

.cta-card {
  position: relative;
  text-align: center;
  padding: 72px 48px;
  background: linear-gradient(135deg, #059669 0%, #10b981 40%, #6366f1 100%);
  border-radius: var(--radius-xl);
  color: white;
  overflow: hidden;
}

.cta-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1), transparent 50%);
  pointer-events: none;
}

.cta-title {
  position: relative;
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 12px;
}

.cta-text {
  position: relative;
  font-size: 1.125rem;
  opacity: 0.9;
  margin-bottom: 32px;
}

.cta-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  background: white;
  color: #059669;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none;
  transition: all var(--transition-fast);
}

.cta-btn:hover {
  background: #f0fdf4;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  color: #047857;
}

.recommendations-section {
  padding: 48px 0;
}

.recommendations-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 32px;
}

.view-all-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
  white-space: nowrap;
  transition: gap var(--transition-fast);
}
.view-all-link:hover { gap: 10px; }

.recommendations-loading {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.rec-skeleton {
  height: 280px;
  border-radius: var(--radius-md);
  background: var(--color-skeleton);
  animation: shimmer 1.5s ease infinite;
}

.recommendations-empty {
  text-align: center;
  padding: 48px 24px;
  color: var(--color-text-secondary);
}
.recommendations-empty p { margin-bottom: 16px; }

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.rec-card {
  display: flex;
  flex-direction: column;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  text-decoration: none;
  transition: all var(--transition-base);
  animation: fade-in-up 0.5s ease both;
}
.rec-card:nth-child(1) { animation-delay: 0.0s; }
.rec-card:nth-child(2) { animation-delay: 0.08s; }
.rec-card:nth-child(3) { animation-delay: 0.16s; }
.rec-card:nth-child(4) { animation-delay: 0.24s; }
.rec-card:nth-child(5) { animation-delay: 0.32s; }
.rec-card:nth-child(6) { animation-delay: 0.40s; }
.rec-card:nth-child(7) { animation-delay: 0.48s; }
.rec-card:nth-child(8) { animation-delay: 0.56s; }

.rec-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
  border-color: var(--color-accent-light);
}

.rec-card-img {
  position: relative;
  height: 120px;
  overflow: hidden;
  background: var(--color-bg-tertiary);
}
.rec-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}
.rec-card:hover .rec-card-img img { transform: scale(1.08); }

.rec-badge {
  position: absolute;
  top: 8px;
  padding: 2px 8px;
  font-size: 0.6875rem;
  font-weight: 700;
  border-radius: var(--radius-full);
  letter-spacing: 0.02em;
}
.verified-badge {
  left: 8px;
  background: #10b981;
  color: white;
}
.distance-badge {
  right: 8px;
  background: rgba(0,0,0,0.65);
  color: white;
  backdrop-filter: blur(4px);
}

.rec-card-body {
  padding: 14px 16px 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.rec-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rec-price-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.rec-price {
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--color-accent);
}

.rec-original-price {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  text-decoration: line-through;
}

.rec-discount-pct {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #ef4444;
  background: #fef2f2;
  padding: 1px 6px;
  border-radius: var(--radius-full);
}

.rec-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.rec-tags {
  display: flex;
  gap: 6px;
  margin-top: auto;
  flex-wrap: wrap;
}

.rec-tag {
  font-size: 0.6875rem;
  padding: 2px 8px;
  background: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
  border-radius: var(--radius-full);
}

@media (max-width: 768px) {
  .hero-section { padding: 100px 0 60px; }
  .hero-title { font-size: 2.5rem; }
  .hero-actions { flex-direction: column; align-items: center; }
  .hero-stats { flex-wrap: wrap; gap: 16px; }
  .stat-divider { display: none; }
  .images-grid { grid-template-columns: 1fr; }
  .steps-grid { grid-template-columns: 1fr; }
  .cta-card { padding: 48px 24px; }
  .cta-title { font-size: 1.75rem; }
  .recommendations-grid,
  .recommendations-loading { grid-template-columns: 1fr; }
  .recommendations-header { flex-direction: column; align-items: flex-start; gap: 8px; }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .steps-grid { grid-template-columns: 1fr 1fr; }
  .recommendations-grid,
  .recommendations-loading { grid-template-columns: 1fr 1fr; }
}
</style>
