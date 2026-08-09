<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { getSocket } from '../services/socket/socket'
import { dealsService } from '../services/api'
import { freeApis } from '../services/freeApis'
import { useLocation } from '../composables/useLocation'
import type { Deal } from '../types'
import { formatVND } from '../utils/currency'

const {
  userLocation,
  permission,
  isWatching,
  startWatching,
  getOnce,
  resolvePermission,
  setDefault,
} = useLocation()

const mapContainer = ref<HTMLDivElement | null>(null)
const map = shallowRef<L.Map | null>(null)
const userMarker = shallowRef<L.Marker | null>(null)
const markerCluster = shallowRef<any>(null)
const deals = ref<Deal[]>([])
const selectedDeal = ref<Deal | null>(null)
const dealAddress = ref<string | null>(null)
let addressReqId = 0
const isLoading = ref(true)
const isLocating = ref(false)
const isRouting = ref(false)
const error = ref('')
const searchQuery = ref('')
const category = ref('All')
const showMap = ref(false)
const showFilters = ref(false)
const routeMode = ref<'walking' | 'driving' | 'cycling'>('walking')
const route = useRoute()
const routeInfo = ref<{ distanceKm: number; durationMin: number } | null>(null)
const routeLine = shallowRef<any>(null)
const showLocationPrompt = ref(true)
const followLocation = ref(true)

const selectedStore = ref('')
const selectedRating = ref(0)
const verifiedOnly = ref(false)
const minDiscount = ref(0)
const radiusKm = ref(0)
const sortBy = ref<'default' | 'discount' | 'price-asc' | 'price-desc'>('default')

const PAGE_SIZE = 12
const visibleCount = ref(PAGE_SIZE)

const ratingOptions = [5, 4, 3, 2, 1]
const discountTiers = [10, 20, 30, 50]
const radiusOptions = [1, 3, 5, 10]

function discountPct(d: any) {
  return d.originalPrice && d.discountPrice ? Math.round((1 - d.discountPrice / d.originalPrice) * 100) : 0
}
function isSurpriseDeal(d: any) {
  return (d.tags || []).includes('surprise') || d.metadata?.surpriseBag === true || d.metadata?.surprise_bag === true
}
const dealRating = (d: Deal) => Math.round((d.store?.avgTrustScore ?? 0) / 20)

const stores = computed(() => {
  const s = new Set<string>()
  deals.value.forEach((d) => d.store?.name && s.add(d.store.name))
  return [...s].sort()
})
const categories = ['Food', 'Drinks', 'Bakery', 'Grocery', 'Asian', 'Western', 'Dessert', 'Healthy']
const categoryOptions = [
  { id: 'food', name: 'Food' },
  { id: 'drinks', name: 'Drinks' },
  { id: 'bakery', name: 'Bakery' },
  { id: 'grocery', name: 'Grocery' },
  { id: 'asian', name: 'Asian' },
  { id: 'western', name: 'Western' },
  { id: 'dessert', name: 'Dessert' },
  { id: 'healthy', name: 'Healthy' },
]
const categoryKeywords: Record<string, Array<string> | undefined> = {
  Food: [
    'com',
    'ga',
    'bento',
    'banh mi',
    'sandwich',
    'pizza',
    'dimsum',
    'tokbokki',
    'kimbap',
    'ramen',
    'takoyaki',
    'xuc xich',
    'chao',
    'xoi',
  ],
  Drinks: ['uong', 'ca phe', 'tra', 'nuoc', 'bia', 'sua chua', 'yen sao', 'tra dao', 'sua'],
  Bakery: ['banh', 'baguette', 'flan'],
  Grocery: ['thuc pham', 'rau', 'thit', 'ca', 'tom', 'trung', 'gao', 'trai cay', 'pho mai', 'dau olive', 'pasta'],
  Asian: ['han', 'nhat', 'hoa', 'viet', 'kim chi', 'kim bap', 'taiyaki', 'mochi'],
  Western: ['nhap khau', 'phap', 'duc', 'tay', 'bit tet', 'ruou', 'pasta'],
  Dessert: ['trang mieng', 'kem', 'ngot', 'mochi', 'che', 'flan', 'taiyaki'],
  Healthy: ['healthy', 'suc khoe', 'khong duong', 'rau', 'salad', 'nguyen cam', 'tuoi song'],
}
function dealMatchesCategory(d: Deal, name: string) {
  const keywords = categoryKeywords[name]
  if (!keywords) return true
  const tags = (d.tags || []).map((t) => (t || '').toLowerCase().replace(/_/g, ' '))
  return tags.some((t) => keywords.some((k) => t.includes(k)))
}
function normalizeCategoryQuery(value: string) {
  const found = categoryOptions.find((o) => o.id === value.toLowerCase())
  return found ? found.name : value
}
const activeFiltersCount = computed(
  () =>
    [selectedStore.value, selectedRating.value, minDiscount.value, radiusKm.value].filter(Boolean).length +
    (verifiedOnly.value ? 1 : 0) +
    (category.value !== 'All' ? 1 : 0) +
    (searchQuery.value.trim() ? 1 : 0)
)

const filteredDeals = computed(() => {
  const withDistance: Array<Deal & { distanceKm?: number }> = deals.value.map((d) => ({
    ...d,
    distanceKm: userLocation.value
      ? calcDistance(userLocation.value.lat, userLocation.value.lng, Number(d.latitude), Number(d.longitude))
      : undefined,
  }))
  let result = withDistance.filter((d) => {
    if (selectedStore.value && d.store?.name !== selectedStore.value) return false
    if (verifiedOnly.value && !d.verified) return false
    if (minDiscount.value && discountPct(d) < minDiscount.value) return false
    if (selectedRating.value && dealRating(d) < selectedRating.value) return false
    if (radiusKm.value && d.distanceKm !== undefined && d.distanceKm > radiusKm.value) return false
    return true
  })
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter((d) => d.title.toLowerCase().includes(q) || d.store?.name?.toLowerCase().includes(q))
  }
  if (category.value && category.value !== 'All') {
    result = result.filter((d) => dealMatchesCategory(d, category.value))
  }
  switch (sortBy.value) {
    case 'discount':
      result.sort((a, b) => discountPct(b) - discountPct(a))
      break
    case 'price-asc':
      result.sort((a, b) => (a.discountPrice || 0) - (b.discountPrice || 0))
      break
    case 'price-desc':
      result.sort((a, b) => (b.discountPrice || 0) - (a.discountPrice || 0))
      break
    default:
      if (userLocation.value) result.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
  }
  return result
})

const pagedDeals = computed(() => filteredDeals.value.slice(0, visibleCount.value))
const showingCount = computed(() => Math.min(visibleCount.value, filteredDeals.value.length))
const hasMore = computed(() => filteredDeals.value.length > visibleCount.value)

function loadMore() {
  visibleCount.value += PAGE_SIZE
}

let joinedDealIds = new Set<string>()
function joinDealRooms(list: Deal[]) {
  const socket = getSocket()
  const next = new Set<string>()
  list.forEach((d: any) => {
    if (d?.id && !next.has(d.id)) {
      next.add(d.id)
      socket.emit('deal:join', d.id)
    }
  })
  joinedDealIds.forEach((id) => {
    if (!next.has(id)) socket.emit('deal:leave', id)
  })
  joinedDealIds = next
}
function leaveAllDealRooms() {
  const socket = getSocket()
  joinedDealIds.forEach((id) => socket.emit('deal:leave', id))
  joinedDealIds = new Set()
}

onMounted(async () => {
  const c = route.query.category as string | undefined
  if (c) category.value = normalizeCategoryQuery(c)
  showLocationPrompt.value = !userLocation.value
  await loadDeals()
  await nextTick()
  if (showMap.value) await nextTick(initMap)
  if (userLocation.value) {
    drawUserMarker()
    centerMap(userLocation.value.lat, userLocation.value.lng, 13)
  }
  initLocationTracking()

  const socket = getSocket()
  socket.on('deal:created', (deal: Deal) => {
    if (deal?.id) socket.emit('deal:join', deal.id)
    deals.value = [deal, ...deals.value]
    scheduleMarkerUpdate()
  })
  socket.on('deal:quantity', (p: { id: string; remaining: number }) => {
    const d = deals.value.find((i) => i.id === p.id)
    if (d) d.remainingQuantity = p.remaining
  })
  socket.on('deal:updated', (p: { id: string; changes: any }) => {
    const d = deals.value.find((i) => i.id === p.id)
    if (d && p.changes) {
      Object.assign(d, p.changes)
      scheduleMarkerUpdate()
    }
  })
})
onUnmounted(() => {
  leaveAllDealRooms()
  map.value?.remove()
})

watch([() => route.query.category, () => route.query.search], ([nextCategory, nextSearch]) => {
  if (typeof nextSearch === 'string' && searchQuery.value !== nextSearch) searchQuery.value = nextSearch
  if (typeof nextCategory === 'string' && category.value !== normalizeCategoryQuery(nextCategory))
    category.value = normalizeCategoryQuery(nextCategory)
})
watch(
  [selectedStore, selectedRating, verifiedOnly, minDiscount, radiusKm, searchQuery, category, sortBy],
  () => {
    visibleCount.value = PAGE_SIZE
  }
)
watch(filteredDeals, () => {
  scheduleMarkerUpdate()
  joinDealRooms(filteredDeals.value)
})
watch(showMap, (v: boolean) => {
  if (v) nextTick(initMap)
  else deselectDeal()
})

let markerUpdateTimer: number | undefined
let listRefreshTimer: number | undefined
function scheduleMarkerUpdate() {
  window.clearTimeout(markerUpdateTimer)
  markerUpdateTimer = window.setTimeout(rebuildMarkers, 50)
  window.clearTimeout(listRefreshTimer)
  listRefreshTimer = window.setTimeout(() => joinDealRooms(deals.value), 200)
}

async function loadDeals() {
  isLoading.value = true
  error.value = ''
  try {
    const first = await dealsService.findAll({ status: 'active', limit: 100, page: 1 })
    let loaded: Deal[] = first.deals || []
    if (first.totalPages > 1) {
      for (let p = 2; p <= first.totalPages; p++) {
        const next = await dealsService.findAll({ status: 'active', limit: 100, page: p })
        loaded = loaded.concat(next.deals || [])
      }
    }
    deals.value = loaded
  } catch {
    deals.value = []
  } finally {
    isLoading.value = false
  }
}
function resetFilters() {
  selectedStore.value = ''
  selectedRating.value = 0
  verifiedOnly.value = false
  minDiscount.value = 0
  radiusKm.value = 0
  searchQuery.value = ''
  category.value = 'All'
}
function initMap() {
  if (!mapContainer.value || map.value) return
  map.value = L.map(mapContainer.value, { center: [10.8231, 106.6297], zoom: 12, zoomControl: false })
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  }).addTo(map.value)
  L.control.zoom({ position: 'topright' }).addTo(map.value)
  markerCluster.value = (L as any).markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 46,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
  })
  map.value.addLayer(markerCluster.value)
  map.value.on('click', () => deselectDeal())
  // Stop following the live position once the user starts dragging the map.
  map.value.on('dragstart', () => {
    followLocation.value = false
  })
  rebuildMarkers()
}

const markerMap = new Map<string, L.Marker>()
function createDealIcon(deal: Deal, selected = false) {
  const pct = discountPct(deal)
  const color = selected ? '#059669' : deal.verified ? '#10b981' : '#ee4d2d'
  return L.divIcon({
    html:
      '<div class="deal-marker" style="--mc:' +
      color +
      '">' +
      '<span class="deal-marker-price">' +
      (isSurpriseDeal(deal) ? 'Surprise' : pct > 0 ? '-' + pct + '%' : formatVND(Number(deal.discountPrice))) +
      '</span>' +
      '<span class="deal-marker-dot"></span></div>',
    className: '',
    iconSize: L.point(70, 34),
    iconAnchor: L.point(35, 34),
  })
}
function rebuildMarkers() {
  if (!markerCluster.value) return
  markerCluster.value.clearLayers()
  markerMap.clear()
  filteredDeals.value.forEach((deal) => {
    const marker = L.marker([Number(deal.latitude), Number(deal.longitude)], {
      icon: createDealIcon(deal, selectedDeal.value?.id === deal.id),
    })
    marker.on('click', () => selectDeal(deal))
    markerMap.set(deal.id, marker)
    markerCluster.value.addLayer(marker)
  })
}
function drawUserMarker() {
  if (!map.value || !userLocation.value) return
  if (userMarker.value) map.value.removeLayer(userMarker.value)
  const el = document.createElement('div')
  el.className = 'user-loc-marker'
  el.innerHTML = '<div class="user-loc-pulse"></div><div class="user-loc-dot"></div>'
  userMarker.value = L.marker([userLocation.value.lat, userLocation.value.lng], {
    icon: L.divIcon({ html: el.outerHTML, className: '', iconSize: L.point(24, 24), iconAnchor: L.point(12, 12) }),
    zIndexOffset: 10000,
  })
    .addTo(map.value)
    .bindPopup('Your location')
}
function centerMap(lat: number, lng: number, zoom = 14) {
  map.value?.setView([lat, lng], zoom)
}

async function locateUser() {
  isLocating.value = true
  error.value = ''
  try {
    const loc = await getOnce()
    if (loc) {
      showLocationPrompt.value = false
      if (!map.value) await nextTick(initMap)
      drawUserMarker()
      centerMap(loc.lat, loc.lng)
      // Keep it live: subscribe to position changes after the first fix.
      if (permission.value !== 'denied') startWatching(onLivePosition)
    } else {
      const ip = await freeApis.detectLocation()
      if (ip) {
        setDefault()
        userLocation.value = { lat: ip.lat, lng: ip.lng }
        showLocationPrompt.value = false
        if (!map.value) await nextTick(initMap)
        drawUserMarker()
        centerMap(userLocation.value.lat, userLocation.value.lng)
      } else if (permission.value === 'denied') {
        error.value = 'Location access is blocked. Enable it in your browser, then try again.'
      } else {
        error.value = 'Could not determine location. Please try again.'
      }
    }
  } catch {
    error.value = 'Could not locate you. Please try again.'
  } finally {
    isLocating.value = false
  }
}

/** Move (or create) the user marker and optional re-center on live updates. */
function onLivePosition(loc: { lat: number; lng: number }) {
  if (!map.value) return
  if (userMarker.value) userMarker.value.setLatLng([loc.lat, loc.lng])
  else drawUserMarker()
  if (followLocation.value) {
    centerMap(loc.lat, loc.lng, Math.max(map.value.getZoom(), 13))
  }
}

/**
 * Resolve permission and, if already granted, begin continuous tracking so the
 * marker follows the user as they move — no cache-clear or reload required.
 * A "prompt"/denied state leaves the enable dialog to the user.
 */
async function initLocationTracking() {
  const state = await resolvePermission()
  if (state === 'granted') {
    showLocationPrompt.value = false
    // Always fetch a fresh, current position — even when a (possibly stale)
    // cached location exists — so the marker converges on where the user
    // actually is right now instead of where they were last time.
    const fresh = await getOnce()
    if (!map.value) await nextTick(initMap)
    drawUserMarker()
    if (fresh) centerMap(fresh.lat, fresh.lng, Math.max(map.value?.getZoom() || 0, 13))
    startWatching(onLivePosition)
  } else if (state === 'denied' && !userLocation.value) {
    // Fall back to IP so the map is still useful; message steers to settings.
    const ip = await freeApis.detectLocation()
    if (ip) {
      userLocation.value = { lat: ip.lat, lng: ip.lng }
      showLocationPrompt.value = false
    }
  }
}
function formatDist(v?: number) {
  return v === undefined ? '' : v < 1 ? Math.round(v * 1000) + 'm' : v.toFixed(1) + 'km'
}
function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = (v: number) => (v * Math.PI) / 180
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
function selectDeal(deal: Deal) {
  selectedDeal.value = deal
  routeInfo.value = null
  rebuildMarkers()
  if (map.value) centerMap(Number(deal.latitude), Number(deal.longitude), 15)
  resolveDealAddress(deal)
}
function deselectDeal() {
  selectedDeal.value = null
  routeInfo.value = null
  dealAddress.value = null
  addressReqId++
  rebuildMarkers()
}
async function resolveDealAddress(deal: Deal) {
  const reqId = ++addressReqId
  dealAddress.value = deal.address || deal.store?.address || null
  if (dealAddress.value) return
  try {
    const addr = await freeApis.reverseGeocode(Number(deal.latitude), Number(deal.longitude))
    if (reqId === addressReqId) dealAddress.value = addr
  } catch {
    /* optional enhancement */
  }
}
async function buildRoute() {
  if (!selectedDeal.value || !userLocation.value) return
  isRouting.value = true
  error.value = ''
  try {
    const route = await freeApis.getRoute(
      [userLocation.value.lat, userLocation.value.lng],
      [Number(selectedDeal.value.latitude), Number(selectedDeal.value.longitude)],
      routeMode.value
    )
    if (!route) throw new Error('')
    routeInfo.value = { distanceKm: route.distanceKm, durationMin: route.durationMin }
    drawRoute(route.geometry)
  } catch {
    error.value = 'Could not calculate directions'
  } finally {
    isRouting.value = false
  }
}
function drawRoute(geo: any) {
  if (!map.value) return
  if (routeLine.value) map.value.removeLayer(routeLine.value)
  const coords = geo.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number])
  routeLine.value = L.polyline(coords, { color: '#ee4d2d', weight: 4, opacity: 0.85 }).addTo(map.value)
  map.value.fitBounds(routeLine.value.getBounds().pad(0.15))
}
function handleAllowLocation() {
  locateUser()
}
function handleSkipLocation() {
  showLocationPrompt.value = false
  setDefault()
  if (!map.value) return
  drawUserMarker()
  centerMap(userLocation.value!.lat, userLocation.value!.lng, 13)
}

/** Re-enable live following and snap the view back to the user's position. */
function handleRecentered() {
  if (!userLocation.value) return
  followLocation.value = true
  if (!map.value) return
  centerMap(userLocation.value.lat, userLocation.value.lng, Math.max(map.value.getZoom(), 14))
}
</script>

<template>
  <div class="explore-page">
    <div class="explore-toolbar">
      <div class="search-wrapper">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search deals, stores..."
          class="toolbar-search"
          aria-label="Search deals, stores"
        />
      </div>
      <div class="toolbar-actions">
        <select v-model="sortBy" class="input input-sm sort-select" aria-label="Sort deals">
          <option value="default">Sort: Default</option>
          <option value="discount">Biggest discount</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
        <button class="btn-ghost btn-icon" :title="showMap ? 'Show list' : 'Show map'" @click="showMap = !showMap">
          <svg
            v-if="showMap"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </button>
        <button class="btn-ghost btn-icon d-md-none" @click="showFilters = true" :title="'Filters'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          <span v-if="activeFiltersCount" class="filter-dot">{{ activeFiltersCount }}</span>
        </button>
      </div>
    </div>

    <div class="explore-layout">
      <aside class="explore-filters" :class="{ open: showFilters }">
        <div class="filters-head">
          <h3 class="filter-title">Filters</h3>
          <button class="btn-ghost btn-sm" @click="resetFilters()">Reset</button>
        </div>
        <div class="filter-body">
          <div class="filter-group">
            <label class="filter-label">Location</label>
            <div v-if="!userLocation" class="flex gap-2">
              <button class="btn btn-sm" @click="locateUser()" :disabled="isLocating">
                {{ isLocating ? 'Locating…' : 'Use my location' }}
              </button>
            </div>
            <div v-else class="flex flex-col gap-2">
              <select v-model="radiusKm" class="input input-sm">
                <option :value="0">All distances</option>
                <option v-for="r in radiusOptions" :key="r" :value="r">{{ r }} km</option>
              </select>
              <div class="location-hint" :class="{ live: isWatching }">
                {{ isWatching ? 'Live · tracking your position' : 'Location set' }}
              </div>
            </div>
          </div>

          <div class="filter-group">
            <label class="filter-label">Store</label>
            <select v-model="selectedStore" class="input input-sm">
              <option value="">All stores</option>
              <option v-for="s in stores" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">Category</label>
            <div class="filter-chips">
              <button @click="category = 'All'" :class="['chip', { active: category === 'All' }]">All</button>
              <button
                v-for="c in categories"
                :key="c"
                @click="category = c"
                :class="['chip', { active: category === c }]"
              >
                {{ c }}
              </button>
            </div>
          </div>

          <div class="filter-group">
            <label class="filter-label">Min rating</label>
            <div class="filter-chips">
              <button @click="selectedRating = 0" :class="['chip', { active: selectedRating === 0 }]">Any</button>
              <button
                v-for="s in ratingOptions"
                :key="s"
                @click="selectedRating = s"
                :class="['chip rating-chip', { active: selectedRating === s }]"
              >
                <span class="stars sm">
                  <svg
                    v-for="i in 5"
                    :key="i"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    :fill="i <= s ? 'var(--color-rating)' : 'none'"
                    :stroke="i <= s ? 'var(--color-rating)' : 'var(--color-text-tertiary)'"
                  >
                    <polygon
                      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                    />
                  </svg>
                </span>
                {{ s }}+
              </button>
            </div>
          </div>

          <div class="filter-group">
            <label class="filter-label">Verified</label>
            <button @click="verifiedOnly = !verifiedOnly" :class="['chip', { active: verifiedOnly }]">
              <svg
                v-if="verifiedOnly"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M20 6L9 17l-4-4" />
              </svg>
              Verified only
            </button>
          </div>

          <div class="filter-group">
            <label class="filter-label">Min discount</label>
            <div class="filter-chips">
              <button @click="minDiscount = 0" :class="['chip', { active: minDiscount === 0 }]">Any</button>
              <button
                v-for="d in discountTiers"
                :key="d"
                @click="minDiscount = d"
                :class="['chip', { active: minDiscount === d }]"
              >
                &ge; {{ d }}%
              </button>
            </div>
          </div>
        </div>
      </aside>
      <div v-if="showFilters" class="filter-backdrop" @click="showFilters = false"></div>

      <main class="explore-main">
        <div v-if="showMap" class="map-section">
          <div v-if="showLocationPrompt" class="location-overlay">
            <div class="location-dialog" role="dialog" aria-label="Enable location?" aria-modal="true" v-focus-trap>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-accent)"
                stroke-width="1.5"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <h3>Enable location?</h3>
              <p>Find the best deals near you with location access.</p>
              <div v-if="permission === 'denied'" class="location-denied">
                Location is blocked in your browser. Allow access for this site, then try again — your position will
                then update automatically as you move.
              </div>
              <div class="location-actions">
                <button class="btn btn-primary" @click="handleAllowLocation">
                  {{ isLocating ? 'Locating...' : 'Enable' }}
                </button>
                <button class="btn btn-outline" @click="handleSkipLocation">Use default location</button>
              </div>
            </div>
          </div>
          <div ref="mapContainer" class="map-canvas"></div>
          <button
            class="btn-locate"
            @click="locateUser"
            :disabled="isLocating"
            title="Locate me"
            aria-label="Locate me"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="3" />
              <circle cx="12" cy="12" r="8" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </button>
          <button
            v-if="userLocation"
            class="btn-locate btn-follow"
            @click="handleRecentered"
            :class="{ active: followLocation }"
            :title="followLocation ? 'Following your live location' : 'Follow my location'"
            :aria-label="followLocation ? 'Following your live location' : 'Follow my location'"
            :aria-pressed="followLocation"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="2.5" />
              <circle cx="12" cy="12" r="8" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
            </svg>
          </button>
          <div v-if="selectedDeal" class="map-info-panel">
            <button class="info-close" @click="deselectDeal" aria-label="Close deal details">&times;</button>
            <div class="info-row">
              <div class="info-thumb">
                <img
                  :src="
                    selectedDeal.images?.[0] ||
                    'https://images.unsplash.com/photo-1586999768265-24af89630739?w=100&q=80'
                  "
                  :alt="selectedDeal.title"
                />
              </div>
              <div class="info-content">
                <h4>{{ selectedDeal.title }}</h4>
                <div class="info-store">{{ selectedDeal.store?.name || 'Store' }}</div>
                <div v-if="dealAddress" class="info-address">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {{ dealAddress }}
                </div>
                <div class="info-price">
                  {{ formatVND(selectedDeal.discountPrice) }}
                  <s v-if="!isSurpriseDeal(selectedDeal) && selectedDeal.originalPrice > selectedDeal.discountPrice">{{
                    formatVND(selectedDeal.originalPrice)
                  }}</s
                  ><span v-if="isSurpriseDeal(selectedDeal)" class="info-up-to"
                    >up to {{ formatVND(selectedDeal.originalPrice) }} value</span
                  >
                </div>
              </div>
            </div>
            <div class="info-meta">
              <span class="info-stock">{{ selectedDeal.remainingQuantity }} left</span>
              <span v-if="userLocation" class="info-dist">{{
                formatDist(
                  calcDistance(
                    userLocation.lat,
                    userLocation.lng,
                    Number(selectedDeal.latitude),
                    Number(selectedDeal.longitude)
                  )
                )
              }}</span>
            </div>
            <div class="info-actions">
              <router-link :to="'/deals/' + selectedDeal.id" class="btn btn-primary btn-sm">Details</router-link>
              <button class="btn btn-outline btn-sm" @click="buildRoute" :disabled="isRouting">
                {{ isRouting ? 'Routing...' : 'Directions' }}
              </button>
              <button
                class="btn-map-center"
                @click="centerMap(Number(selectedDeal.latitude), Number(selectedDeal.longitude), 16)"
                title="Center map"
                aria-label="Center map on this deal"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3" />
                  <circle cx="12" cy="12" r="8" />
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                </svg>
              </button>
            </div>
            <div v-if="routeInfo" class="info-route">
              {{ formatDist(routeInfo.distanceKm) }} and {{ Math.round(routeInfo.durationMin) }} min
            </div>
          </div>
        </div>

        <div v-else class="deals-grid">
          <div v-if="isLoading" class="row g-3">
            <div v-for="n in 6" :key="n" class="col-12 col-sm-6 col-lg-4">
              <div class="skeleton-card"></div>
            </div>
          </div>
          <div v-else-if="filteredDeals.length === 0" class="empty-state">
            <h3>No deals found</h3>
            <p>Try adjusting your filters.</p>
            <button class="btn btn-outline btn-sm" @click="resetFilters()">Reset filters</button>
          </div>
          <div v-else class="row g-3">
            <div v-for="deal in pagedDeals" :key="deal.id" class="col-12 col-sm-6 col-lg-4">
              <router-link :to="'/deals/' + deal.id" class="deal-card h-100">
              <div class="deal-card-img">
                <img
                  :src="deal.images?.[0] || 'https://images.unsplash.com/photo-1586999768265-24af89630739?w=200&q=80'"
                  :alt="deal.title"
                  loading="lazy"
                />
                <span v-if="isSurpriseDeal(deal)" class="deal-surprise">Surprise</span>
                <span v-else-if="discountPct(deal) > 0" class="deal-discount">-{{ discountPct(deal) }}%</span>
                <span v-if="deal.verified" class="deal-badge" title="Verified">V</span>
                <span v-if="deal.remainingQuantity <= 3" class="deal-low-badge">Low</span>
              </div>
              <div class="deal-card-body">
                <div class="deal-store">{{ deal.store?.name || 'Store' }}</div>
                <h4 class="deal-title">{{ deal.title }}</h4>
                <div class="deal-meta-row">
                  <span class="deal-price">{{ formatVND(deal.discountPrice) }}</span>
                  <s v-if="!isSurpriseDeal(deal) && deal.originalPrice > deal.discountPrice" class="deal-original">{{
                    formatVND(deal.originalPrice)
                  }}</s>
                  <span v-else-if="isSurpriseDeal(deal)" class="deal-up-to"
                    >up to {{ formatVND(deal.originalPrice) }} value</span
                  >
                </div>
                <div class="deal-meta-bottom">
                  <span v-if="userLocation && deal.latitude" class="deal-distance">{{
                    formatDist(deal.distanceKm)
                  }}</span>
                </div>
              </div>
              </router-link>
            </div>
          </div>
          <div v-if="filteredDeals.length > PAGE_SIZE" class="load-more-row">
            <p class="showing-text">
              Showing {{ showingCount }} of {{ filteredDeals.length }} deals
            </p>
            <button v-if="hasMore" class="btn btn-primary load-more-btn" @click="loadMore">
              Load more
            </button>
            <p v-else class="all-shown-text">All deals shown</p>
          </div>
        </div>
      </main>
    </div>

    <div v-if="error" class="error-bar">{{ error }}</div>
  </div>
</template>

<style scoped>
.explore-page {
  min-height: calc(100vh - 56px);
  background: var(--color-bg);
}

.explore-toolbar {
  position: sticky;
  top: 56px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border-light);
}

.search-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 460px;
  padding: 8px 14px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.search-wrapper:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}
.toolbar-search {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text);
  font-size: 14px;
  font-family: var(--font-family);
}
.toolbar-search::placeholder {
  color: var(--color-text-tertiary);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sort-select {
  width: auto;
}

.filter-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 15px;
  text-align: center;
}
.btn-icon {
  position: relative;
}

.explore-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 16px 48px;
  align-items: start;
}

.explore-filters {
  position: sticky;
  top: 120px;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  max-height: calc(100vh - 136px);
}
.filters-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border-light);
}
.filter-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}
.filter-body {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
}
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.filter-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-secondary);
}
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-family: var(--font-family);
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s;
}
.chip:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.chip.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}
.rating-chip {
  padding: 6px 10px;
}
.stars.sm {
  display: inline-flex;
  gap: 1px;
}
.location-hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
}
.location-hint.live {
  color: var(--color-rating);
  font-weight: 600;
}
.location-denied {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-danger-bg, rgba(220, 38, 38, 0.08));
  color: var(--color-danger, #dc2626);
  font-size: 0.8125rem;
  line-height: 1.5;
  text-align: left;
}

.explore-main {
  min-width: 0;
}

.map-section {
  position: relative;
  height: calc(100vh - 132px);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}
.map-canvas {
  position: absolute;
  inset: 0;
  height: 100%;
}
.btn-locate {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 500;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  box-shadow: 0 2px 8px var(--color-card-shadow);
}
.btn-locate:disabled {
  opacity: 0.5;
  cursor: default;
}
.btn-follow {
  right: 62px;
}
.btn-follow.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.location-overlay {
  position: absolute;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-overlay);
}
.location-dialog {
  max-width: 340px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 40px var(--color-card-shadow);
}
.location-dialog h3 {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text);
}
.location-dialog p {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.location-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.map-info-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 500;
  width: 300px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 28px var(--color-card-shadow);
}
.info-close {
  position: absolute;
  top: 8px;
  right: 10px;
  border: none;
  background: none;
  color: var(--color-text-tertiary);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.info-close:hover {
  color: var(--color-text);
}
.info-row {
  display: flex;
  gap: 12px;
}
.info-thumb {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
}
.info-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.info-content {
  min-width: 0;
}
.info-content h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.info-store {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}
.info-address {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.info-price {
  font-weight: 700;
  color: var(--color-accent);
  margin-top: 4px;
}
.info-price s {
  font-weight: 400;
  color: var(--color-text-tertiary);
  margin-left: 6px;
}
.info-up-to {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: #7c3aed;
  background: #f3e8ff;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  margin-left: 8px;
}
.info-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.info-stock {
  color: var(--color-warning);
  font-weight: 600;
}
.info-dist {
  color: var(--color-text-tertiary);
}
.info-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.btn-map-center {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
}
.btn-map-center:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.info-route {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-success);
}

.deals-grid {
  min-height: 60vh;
}
.load-more-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}
.load-more-row .showing-text {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
.load-more-row .all-shown-text {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
.load-more-btn {
  min-width: 180px;
}
.deal-card {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.deal-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px var(--color-card-shadow);
}
.deal-card-img {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--color-bg-secondary);
}
.deal-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}
.deal-card:hover .deal-card-img img {
  transform: scale(1.05);
}
.deal-discount {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 8px;
  background: var(--color-accent);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  border-radius: var(--radius-xs);
}
.deal-surprise {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 8px;
  background: linear-gradient(135deg, #9333ea, #6366f1);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  border-radius: var(--radius-xs);
}
.deal-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--color-success);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  border: 2px solid rgba(255, 255, 255, 0.85);
}
.deal-low-badge {
  position: absolute;
  bottom: 10px;
  left: 10px;
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: var(--radius-full);
}
.deal-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px 14px;
}
.deal-store {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.deal-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.8em;
}
.deal-meta-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.deal-price {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-accent);
}
.deal-original {
  font-size: 12px;
  color: var(--color-text-tertiary);
}
.deal-up-to {
  font-size: 11px;
  font-weight: 600;
  color: #7c3aed;
  background: #f3e8ff;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  white-space: nowrap;
}
.deal-meta-bottom {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
}
.deal-distance {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.skeleton-card {
  height: 300px;
  border-radius: var(--radius-lg);
  background: linear-gradient(
    100deg,
    var(--color-bg-secondary) 40%,
    var(--color-surface-container) 50%,
    var(--color-bg-secondary) 60%
  );
  background-size: 200% 100%;
  animation: skeleton-load 1.2s ease-in-out infinite;
}
@keyframes skeleton-load {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 64px 20px;
  text-align: center;
}
.empty-state h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}
.empty-state p {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.error-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  padding: 10px 18px;
  background: var(--color-accent-light);
  color: var(--color-accent-dark);
  font-size: 13px;
  font-weight: 600;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-accent);
}

.flex {
  display: flex;
}
.flex-col {
  flex-direction: column;
}
.gap-2 {
  gap: 8px;
}

.d-md-none {
  display: none;
}
.filter-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: var(--color-overlay);
}

@media (max-width: 1024px) {
  .explore-layout {
    grid-template-columns: 1fr;
  }
  .explore-filters {
    position: fixed;
    top: 56px;
    bottom: 0;
    left: 0;
    width: 300px;
    max-height: none;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    border-radius: 0;
    border: none;
    border-right: 1px solid var(--color-border);
    z-index: 40;
  }
  .explore-filters.open {
    transform: translateX(0);
  }
  .d-md-none {
    display: inline-flex;
  }
  .filter-backdrop {
    display: block;
  }
}

@media (max-width: 560px) {
  .explore-toolbar {
    flex-wrap: wrap;
  }
  .search-wrapper {
    max-width: none;
  }
  .sort-select {
    flex: 1;
  }
}
</style>

<style>
/* Leaflet injects marker HTML via innerHTML, so these must NOT be scoped */
.deal-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
  transition: transform 0.15s;
}
.deal-marker:hover {
  transform: scale(1.1);
  z-index: 1000 !important;
}
.deal-marker-price {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  background: white;
  border: 2px solid var(--mc, #ee4d2d);
  border-radius: 14px;
  font-size: 11px;
  font-weight: 700;
  color: var(--mc, #ee4d2d);
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
}
.deal-marker-dot {
  width: 8px;
  height: 8px;
  background: var(--mc, #ee4d2d);
  border: 2.5px solid white;
  border-radius: 50%;
  margin-top: -5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* -- User location marker -- */
.user-loc-marker {
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-loc-pulse {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.2);
  animation: user-pulse 2s ease infinite;
}
.user-loc-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3b82f6;
  border: 3px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
}
@keyframes user-pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.2;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.6;
  }
}

/* Leaflet cluster fixes */
.leaflet-marker-icon {
  outline: none;
}
.leaflet-container {
  font-family: var(--font-family);
}
</style>
