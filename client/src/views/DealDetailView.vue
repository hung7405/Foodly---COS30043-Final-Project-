<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Carousel } from 'bootstrap'
import { commentsService, dealsService, reservationsService, interactionsService } from '../services/api'
import { getSocket } from '../services/socket/socket'
import { useAuthStore } from '../stores/auth.store'
import { useUiStore } from '../stores/ui.store'
import type { Comment, Deal, Reservation } from '../types'
import RoutesPanel from '../components/map/RoutesPanel.vue'
import RealtimeOrderTimeline from '../components/common/RealtimeOrderTimeline.vue'
import { formatVND } from '../utils/currency'

const RESERVATION_STEPS = [
  { key: 'active', label: 'Hold Active', hint: 'Item reserved for you' },
  { key: 'confirmed', label: 'Confirmed & Ready', hint: 'Store is holding your item' },
]

const IMPACT_KG = 0.3
const IMPACT_CO2 = 2.7

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const uiStore = useUiStore()

const deal = ref<Deal | null>(null)
const comments = ref<Comment[]>([])
const reservation = ref<Reservation | null>(null)
const upsells = ref<Deal[]>([])
const isLoading = ref(true)
const isReserving = ref(false)
const commentText = ref('')
const error = ref('')
const success = ref('')
const countdown = ref<number | null>(null)
const showDirections = ref(false)
const carouselEl = ref<HTMLElement | null>(null)
let carouselInstance: Carousel | null = null

function getBootstrapCarousel(): typeof Carousel | null {
  const g = window as unknown as { bootstrap?: { Carousel: typeof Carousel } }
  return g.bootstrap?.Carousel ?? null
}
const liked = ref(false)
const bookmarked = ref(false)
const togglingLike = ref(false)
const togglingBookmark = ref(false)
const priceDrop = ref(false)
let priceDropTimer: number | undefined
let countdownTimer: number | undefined

const isSurprise = computed(
  () =>
    !!deal.value &&
    (deal.value.tags.includes('surprise') ||
      deal.value.metadata?.surpriseBag === true ||
      deal.value.metadata?.surprise_bag === true)
)

const discountPct = computed(() => {
  if (!deal.value || !deal.value.originalPrice) return 0
  return Math.round((1 - Number(deal.value.discountPrice) / Number(deal.value.originalPrice)) * 100)
})

const DEFAULT_DEAL_IMG = 'https://images.unsplash.com/photo-1586999768265-24af89630739?w=800&q=80'
const carouselImages = computed(() => {
  const imgs = (deal.value?.images || []).filter(Boolean)
  return imgs.length ? imgs : [DEFAULT_DEAL_IMG]
})

const expiresInText = computed(() => {
  if (!deal.value) return ''
  const diff = new Date(deal.value.expiresAt).getTime() - Date.now()
  const hours = Math.max(Math.floor(diff / 3600000), 0)
  const minutes = Math.max(Math.floor((diff % 3600000) / 60000), 0)
  return `${hours}h ${minutes}m`
})

onMounted(async () => {
  await Promise.all([loadDeal(), loadComments(), loadReservation()])
  await loadUpsells()
  if (deal.value) {
    await nextTick()
    const CarouselCtor = getBootstrapCarousel()
    if (CarouselCtor && carouselEl.value) {
      carouselInstance = CarouselCtor.getOrCreateInstance(carouselEl.value, { interval: 5000 })
    }
  }
  if (auth.isAuthenticated) {
    interactionsService.record(String(route.params.id), 'view').catch(() => {})
  } else {
    interactionsService.recordAnonymous(String(route.params.id), 'view').catch(() => {})
  }
  const socket = getSocket()
  socket.emit('deal:join', route.params.id)
  socket.on('deal:updated', (update: any) => {
    if (deal.value && update.id === deal.value.id) {
      const hadPrice = Number(deal.value.discountPrice)
      Object.assign(deal.value, update.changes)
      if (update.changes?.priceDrop && Number(deal.value.discountPrice) < hadPrice) {
        priceDrop.value = true
        if (priceDropTimer) window.clearTimeout(priceDropTimer)
        priceDropTimer = window.setTimeout(() => {
          priceDrop.value = false
        }, 4000)
        uiStore.addToast('Price dropped! Grab it before it is gone.', 'success')
      }
    }
  })
  socket.on('deal:quantity', (payload: { id: string; remaining: number }) => {
    if (deal.value && payload.id === deal.value.id) deal.value.remainingQuantity = payload.remaining
  })
  socket.on('comment:added', (incoming: Comment) => {
    if (incoming.dealId === route.params.id) comments.value.unshift(incoming)
  })
  socket.on('reservation:confirmed', (payload: { id: string }) => {
    if (reservation.value && payload.id === reservation.value.id) {
      reservation.value.status = 'confirmed'
    }
  })
})

onUnmounted(() => {
  if (countdownTimer) window.clearInterval(countdownTimer)
  if (priceDropTimer) window.clearTimeout(priceDropTimer)
  carouselInstance?.dispose()
  carouselInstance = null
  const socket = getSocket()
  socket.emit('deal:leave', route.params.id)
  socket.off('deal:updated')
  socket.off('deal:quantity')
  socket.off('comment:added')
  socket.off('reservation:confirmed')
})

async function loadUpsells() {
  try {
    const all = await dealsService.findAll({ limit: 50 })
    const list = (all.deals ?? all) as Deal[]
    const others = list.filter((d) => d.id !== route.params.id && d.status === 'active')
    const sameStore = others.filter((d) => d.storeId === deal.value?.storeId)
    upsells.value = (sameStore.length ? sameStore : others).slice(0, 4)
  } catch {
    upsells.value = []
  }
}

async function loadDeal() {
  isLoading.value = true
  error.value = ''
  try {
    deal.value = await dealsService.findById(String(route.params.id))
  } catch (err: any) {
    const msg = err.response?.data?.message || 'Deal not found'
    error.value = msg
    if (err.response?.status === 404) {
      uiStore.addToast(msg, 'error')
      await router.push('/explore')
    }
  } finally {
    isLoading.value = false
  }
}

async function loadComments() {
  try {
    comments.value = await commentsService.findByDeal(String(route.params.id))
  } catch {
    comments.value = []
  }
}

async function loadReservation() {
  if (!auth.isAuthenticated) return
  try {
    const mine = await reservationsService.myReservations()
    reservation.value =
      mine.find((item: Reservation) => item.dealId === route.params.id && item.status === 'active') || null
    startCountdownFromReservation()
  } catch {
    reservation.value = null
  }
}

function startCountdownFromReservation() {
  if (countdownTimer) window.clearInterval(countdownTimer)
  if (!reservation.value?.expiresAt) {
    countdown.value = null
    return
  }
  const tick = () => {
    const diff = Math.floor((new Date(reservation.value!.expiresAt).getTime() - Date.now()) / 1000)
    countdown.value = Math.max(diff, 0)
    if (diff <= 0 && countdownTimer) {
      window.clearInterval(countdownTimer)
      reservation.value = null
    }
  }
  tick()
  countdownTimer = window.setInterval(tick, 1000)
}

async function handleReserve() {
  if (!auth.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  isReserving.value = true
  error.value = ''
  success.value = ''
  try {
    const reserved = await reservationsService.reserve(String(route.params.id))
    reservation.value = reserved
    if (deal.value) deal.value.remainingQuantity = Math.max(deal.value.remainingQuantity - 1, 0)
    success.value = 'Item reserved! Redirecting to payment...'
    setTimeout(() => router.push(`/payments/${reserved.id}`), 1000)
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not reserve this item.'
  } finally {
    isReserving.value = false
  }
}

async function addComment() {
  if (!commentText.value.trim()) return
  if (!auth.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  try {
    const comment = await commentsService.create(String(route.params.id), commentText.value.trim())
    comments.value.unshift(comment)
    if (deal.value) deal.value.commentCount += 1
    commentText.value = ''
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not post your comment.'
  }
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function openRouteFromExplore() {
  if (!deal.value) return
  router.push({ path: '/explore', query: { dealId: deal.value.id } })
}

async function toggleLike() {
  if (!auth.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (!deal.value || togglingLike.value) return
  togglingLike.value = true
  const prevLiked = liked.value
  const prevCount = deal.value.likeCount
  liked.value = !prevLiked
  deal.value.likeCount = Math.max(0, prevCount + (liked.value ? 1 : -1))
  try {
    const res = await dealsService.toggleLike(deal.value.id)
    if (res.liked !== liked.value) {
      liked.value = res.liked
      deal.value.likeCount = Math.max(0, prevCount + (res.liked ? 1 : -1))
    }
    interactionsService.record(deal.value.id, res.liked ? 'like' : 'unlike').catch(() => {})
  } catch {
    liked.value = prevLiked
    deal.value.likeCount = prevCount
    uiStore.addToast('Could not update like. Please try again.', 'error')
  } finally {
    togglingLike.value = false
  }
}

async function toggleBookmark() {
  if (!auth.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (!deal.value || togglingBookmark.value) return
  togglingBookmark.value = true
  const prevBookmarked = bookmarked.value
  const prevCount = deal.value.bookmarkCount
  bookmarked.value = !prevBookmarked
  deal.value.bookmarkCount = Math.max(0, prevCount + (bookmarked.value ? 1 : -1))
  try {
    const res = await dealsService.toggleBookmark(deal.value.id)
    if (res.bookmarked !== bookmarked.value) {
      bookmarked.value = res.bookmarked
      deal.value.bookmarkCount = Math.max(0, prevCount + (res.bookmarked ? 1 : -1))
    }
    interactionsService.record(deal.value.id, res.bookmarked ? 'bookmark' : 'unbookmark').catch(() => {})
  } catch {
    bookmarked.value = prevBookmarked
    deal.value.bookmarkCount = prevCount
    uiStore.addToast('Could not update bookmark. Please try again.', 'error')
  } finally {
    togglingBookmark.value = false
  }
}
</script>

<template>
  <div class="deal-detail-page">
    <div class="container">
      <router-link to="/explore" class="back-link">Back to explore</router-link>

      <div v-if="error" class="state-banner error" role="alert">{{ error }}</div>
      <div v-if="success" class="state-banner success">{{ success }}</div>

      <div v-if="isLoading" class="skeleton-detail">
        <div class="skeleton hero-skeleton"></div>
        <div class="skeleton line-skeleton"></div>
        <div class="skeleton short-skeleton"></div>
      </div>

      <div v-else-if="deal" class="deal-detail">
        <div class="deal-detail-grid">
          <div class="deal-images">
            <div ref="carouselEl" id="dealCarousel" class="carousel slide carousel-fade" data-bs-ride="carousel" data-bs-interval="5000">
              <div class="carousel-inner">
                <div
                  v-for="(img, i) in carouselImages"
                  :key="i"
                  class="carousel-item"
                  :class="{ active: i === 0 }"
                >
                  <img :src="img" :alt="deal.title" class="d-block w-100 main-image-img" />
                </div>
              </div>
              <div v-if="carouselImages.length > 1" class="carousel-indicators">
                <button
                  v-for="i in carouselImages.length"
                  :key="i"
                  type="button"
                  data-bs-target="#dealCarousel"
                  :data-bs-slide-to="i - 1"
                  :class="{ active: i === 1 }"
                  :aria-label="'Slide ' + i"
                  :aria-current="i === 1 ? 'true' : undefined"
                ></button>
              </div>
              <button
                v-if="carouselImages.length > 1"
                class="carousel-control-prev"
                type="button"
                data-bs-target="#dealCarousel"
                data-bs-slide="prev"
                aria-label="Previous image"
              >
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Previous</span>
              </button>
              <button
                v-if="carouselImages.length > 1"
                class="carousel-control-next"
                type="button"
                data-bs-target="#dealCarousel"
                data-bs-slide="next"
                aria-label="Next image"
              >
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Next</span>
              </button>
            </div>
          </div>

          <div class="deal-info">
            <div class="badge-row">
              <span v-if="isSurprise" class="badge badge-surprise">Surprise Bag</span>
              <span v-if="deal.verified" class="badge badge-verified">Verified by moderator</span>
              <span class="badge badge-store">{{ deal.store?.name || 'Community store' }}</span>
            </div>

            <h1>{{ deal.title }}</h1>

            <div class="deal-pricing" :class="{ 'price-flash': priceDrop }">
              <span class="price-big">{{ formatVND(Number(deal.discountPrice)) }}</span>
              <span v-if="!isSurprise" class="price-strike">{{ formatVND(Number(deal.originalPrice)) }}</span>
              <span v-if="!isSurprise" class="discount-badge">Save {{ discountPct }}%</span>
              <span v-else class="discount-badge">up to {{ formatVND(Number(deal.originalPrice)) }} value</span>
            </div>

            <div v-if="priceDrop" class="price-drop-banner">Price just dropped! Reserve now before it is gone.</div>

            <div v-if="isSurprise" class="surprise-note">
              <strong>What is a Surprise Bag?</strong>
              <p>
                You get a mystery selection of fresh food near its end-of-day, worth up to
                {{ formatVND(Number(deal.originalPrice)) }}. Open it at pickup — contents vary daily and are always
                delicious.
              </p>
            </div>

            <p class="deal-description">{{ deal.description }}</p>

            <div class="impact-strip">
              <span>🌱 saves ~{{ IMPACT_KG.toFixed(1) }} kg food</span>
              <span>🌍 avoids ~{{ IMPACT_CO2.toFixed(1) }} kg CO₂e</span>
            </div>

            <div class="deal-expiry">
              <span
                >Expires in <strong>{{ expiresInText }}</strong></span
              >
              <span>{{ deal.address }}</span>
              <span
                ><strong>{{ deal.remainingQuantity }}</strong> items remaining</span
              >
            </div>

            <div class="reservation-section">
              <div v-if="reservation && countdown !== null" class="reserved-card">
                <h4>Reserved successfully</h4>
                <p>
                  Pickup code <strong>{{ reservation.reservationCode }}</strong>
                </p>
                <p>
                  Hold expires in <strong>{{ formatCountdown(countdown) }}</strong>
                </p>
                <RealtimeOrderTimeline
                  :steps="RESERVATION_STEPS"
                  :current-index="reservation.status === 'confirmed' ? 2 : 0"
                  :state="reservation.status === 'confirmed' ? 'active' : 'active'"
                  :expires-at="reservation.expiresAt"
                  :show-countdown="reservation.status === 'active'"
                  style="margin-top: 14px"
                />
                <button class="btn btn-outline directions-btn" @click="showDirections = !showDirections">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                  {{ showDirections ? 'Hide Directions' : 'Get Directions' }}
                </button>
              </div>

              <button
                v-else-if="deal.remainingQuantity > 0"
                class="btn btn-primary btn-lg reserve-btn"
                :disabled="isReserving"
                @click="handleReserve"
              >
                {{ isReserving ? 'Reserving...' : isSurprise ? 'Reserve Surprise Bag' : 'Reserve 15-Minute Hold' }}
              </button>

              <div v-else class="sold-out">
                <h4>Sold out</h4>
                <p>This listing has already been claimed.</p>
              </div>
            </div>

            <RoutesPanel
              :destination-lat="deal.latitude"
              :destination-lng="deal.longitude"
              :destination-name="deal.store?.name || deal.title"
              :visible="showDirections"
              @close="showDirections = false"
            />

            <div class="secondary-actions">
              <button class="btn btn-outline" @click="openRouteFromExplore">Open Route in Map View</button>
            </div>

            <div class="deal-stats">
              <button class="stat-btn" :class="{ active: liked }" :disabled="togglingLike" @click="toggleLike">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  :fill="liked ? '#ee4d2d' : 'none'"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  />
                </svg>
                <span>{{ deal.likeCount }}</span>
              </button>
              <button
                class="stat-btn"
                :class="{ active: bookmarked }"
                :disabled="togglingBookmark"
                @click="toggleBookmark"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  :fill="bookmarked ? '#f59e0b' : 'none'"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                <span>{{ deal.bookmarkCount }}</span>
              </button>
              <span class="stat-btn stat-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>{{ deal.commentCount }}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="comments-section">
          <h3>Community comments</h3>

          <div class="comment-form">
            <label class="sr-only" for="commentText">Add a comment</label>
            <textarea
              id="commentText"
              v-model="commentText"
              rows="3"
              placeholder="Share pickup tips, freshness notes, or confirmation..."
            />
            <button class="btn btn-primary" :disabled="!commentText.trim()" @click="addComment">Post Comment</button>
          </div>

          <div v-if="comments.length === 0" class="empty-state">
            <h3>No comments yet</h3>
            <p>Be the first to help the next user with pickup context.</p>
          </div>

          <article v-for="comment in comments" :key="comment.id" class="comment-item">
            <div class="comment-avatar">{{ comment.user?.username?.charAt(0).toUpperCase() || '?' }}</div>
            <div class="comment-body">
              <div class="comment-header">
                <strong>{{ comment.user?.username || 'Community member' }}</strong>
                <span>{{ new Date(comment.createdAt).toLocaleString() }}</span>
              </div>
              <p>{{ comment.content }}</p>
            </div>
          </article>
        </div>

        <div v-if="upsells.length" class="upsell-section">
          <h3>You might also love</h3>
          <div class="upsell-grid">
            <router-link v-for="u in upsells" :key="u.id" :to="'/deals/' + u.id" class="upsell-card">
              <div class="upsell-img">
                <img
                  :src="u.images?.[0] || 'https://images.unsplash.com/photo-1586999768265-24af89630739?w=300&q=80'"
                  :alt="u.title"
                  loading="lazy"
                />
              </div>
              <div class="upsell-body">
                <div class="upsell-store">{{ u.store?.name || 'Store' }}</div>
                <h4>{{ u.title }}</h4>
                <div class="upsell-price">
                  <strong>{{ formatVND(Number(u.discountPrice)) }}</strong>
                  <s v-if="!u.tags.includes('surprise')">{{ formatVND(Number(u.originalPrice)) }}</s>
                </div>
              </div>
            </router-link>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <h3>Deal not found</h3>
        <p>This listing may have expired or been removed.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deal-detail-page {
  padding: 24px 0 60px;
  animation: fade-in 0.4s ease;
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 24px;
  padding-right: 24px;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 24px;
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 0.875rem;
  transition: color var(--transition-fast);
}
.back-link:hover {
  color: var(--color-accent);
}
.state-banner {
  margin-bottom: 16px;
  padding: 14px 18px;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
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
.deal-detail-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 48px;
  align-items: start;
}
.deal-images {
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: var(--color-bg-tertiary);
  box-shadow: var(--shadow-lg);
  position: relative;
}
.main-image-img {
  width: 100%;
  height: 460px;
  object-fit: cover;
  display: block;
}
.deal-images .carousel-indicators {
  margin-bottom: 12px;
}
.deal-images .carousel-indicators [data-bs-target] {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.2);
}
.badge-row {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.badge {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.badge-verified {
  background: #dcfce7;
  color: #166534;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.badge-verified::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #166534;
}
.badge-surprise {
  background: #f3e8ff;
  color: #6d28d9;
}
.badge-store {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}
.deal-info h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--color-text);
  letter-spacing: -0.02em;
  line-height: 1.25;
}
.deal-pricing {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.price-big {
  font-size: 2.25rem;
  font-weight: 800;
  color: var(--color-accent);
  letter-spacing: -0.03em;
}
.price-strike {
  color: var(--color-text-tertiary);
  text-decoration: line-through;
  font-size: 1rem;
}
.discount-badge {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  background: var(--color-accent-light);
  color: var(--color-accent);
  font-weight: 700;
  font-size: 0.8125rem;
}
.price-flash {
  animation: price-pulse 1s ease 2;
}
@keyframes price-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
}
.price-drop-banner {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
  font-weight: 600;
  font-size: 0.875rem;
}
.surprise-note {
  padding: 16px 18px;
  background: #faf5ff;
  border: 1px dashed #c4b5fd;
  border-radius: var(--radius-md);
  margin-bottom: 18px;
}
.surprise-note strong {
  color: #6d28d9;
  font-size: 0.875rem;
}
.surprise-note p {
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  line-height: 1.6;
  margin-top: 4px;
}
.impact-strip {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.impact-strip span {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #166534;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: 6px 12px;
  border-radius: var(--radius-full);
}
.deal-description {
  color: var(--color-text-secondary);
  line-height: 1.75;
  margin-bottom: 24px;
  font-size: 0.9375rem;
}
.deal-expiry {
  display: grid;
  gap: 10px;
  padding: 18px 20px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: 28px;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}
.deal-expiry strong {
  color: var(--color-text);
  font-weight: 600;
}
.reservation-section {
  margin-bottom: 20px;
}
.reserve-btn {
  width: 100%;
  justify-content: center;
  padding: 14px;
  font-size: 0.9375rem;
  border-radius: var(--radius-md);
}
.reserved-card {
  padding: 24px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-lg);
  text-align: center;
}
.reserved-card h4 {
  color: #166534;
  margin-bottom: 8px;
  font-size: 1rem;
}
.reserved-card p + p {
  margin-top: 8px;
}
.directions-btn {
  margin-top: 12px;
  width: 100%;
  justify-content: center;
}
.sold-out {
  padding: 24px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  text-align: center;
}
.sold-out h4 {
  font-size: 1rem;
  margin-bottom: 4px;
}
.secondary-actions {
  margin-bottom: 20px;
}
.deal-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}
.stat-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-family);
}
.stat-btn:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-light);
}
.stat-btn.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-light);
}
.stat-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.stat-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text-tertiary);
  font-size: 0.8125rem;
  font-weight: 500;
}
.comments-section {
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid var(--color-border);
}
.comments-section > h3 {
  margin-bottom: 20px;
  font-size: 1.1rem;
  font-weight: 700;
}
.upsell-section {
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid var(--color-border);
}
.upsell-section > h3 {
  margin-bottom: 20px;
  font-size: 1.1rem;
  font-weight: 700;
}
.upsell-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.upsell-card {
  display: block;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}
.upsell-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}
.upsell-img {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--color-bg-tertiary);
}
.upsell-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.upsell-body {
  padding: 12px 14px;
}
.upsell-store {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--color-text-tertiary);
  margin-bottom: 4px;
}
.upsell-body h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
  line-height: 1.3;
}
.upsell-price {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.upsell-price strong {
  color: var(--color-accent);
  font-size: 0.9375rem;
}
.upsell-price s {
  color: var(--color-text-tertiary);
  font-size: 0.75rem;
}
@media (max-width: 900px) {
  .upsell-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 520px) {
  .upsell-grid {
    grid-template-columns: 1fr;
  }
}
.comment-form {
  display: grid;
  gap: 12px;
  margin-bottom: 32px;
}
.comment-form textarea {
  width: 100%;
  padding: 14px 16px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-family);
  font-size: 0.875rem;
  resize: vertical;
  transition: border-color var(--transition-fast);
}
.comment-form textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(238, 77, 45, 0.08);
}
.comment-item {
  display: flex;
  gap: 14px;
  padding: 18px 0;
  border-bottom: 1px solid var(--color-border-light);
}
.comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-accent-light);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
  font-size: 0.875rem;
}
.comment-header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.comment-header strong {
  font-size: 0.875rem;
}
.comment-header span {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}
.comment-body p {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  line-height: 1.6;
}
.hero-skeleton {
  height: 460px;
  border-radius: var(--radius-xl);
}
.line-skeleton {
  height: 32px;
  width: 62%;
  margin-top: 20px;
}
.short-skeleton {
  height: 20px;
  width: 38%;
}
@media (max-width: 900px) {
  .deal-detail-page {
    padding: 16px 16px 60px;
  }
  .deal-detail-grid {
    grid-template-columns: 1fr;
    gap: 28px;
  }
  .main-image-img {
    height: 320px;
  }
  .deal-info h1 {
    font-size: 1.35rem;
  }
  .price-big {
    font-size: 1.75rem;
  }
}
</style>
