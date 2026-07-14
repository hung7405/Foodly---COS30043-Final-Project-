<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { getSocket } from '../services/socket/socket'
import { dealsService } from '../services/api'
import { freeApis } from '../services/freeApis'
import type { Deal } from '../types'
import { formatVND } from '../utils/currency'

const mapContainer = ref<HTMLDivElement | null>(null)
const map = ref<L.Map | null>(null)
const userMarker = ref<L.Marker | null>(null)
const markerCluster = ref<any>(null)
const deals = ref<Deal[]>([])
const selectedDeal = ref<Deal | null>(null)
const isLoading = ref(true)
const isLocating = ref(false)
const isRouting = ref(false)
const error = ref('')
const searchQuery = ref('')
const showMap = ref(true)
const routeMode = ref<'walking' | 'driving' | 'cycling'>('walking')
const route = useRoute()
const routeInfo = ref<{ distanceKm: number; durationMin: number } | null>(null)
const userLocation = ref<{ lat: number; lng: number } | null>(null)
const routeLine = ref<any>(null)
const showLocationPrompt = ref(true)
let searchTimer: number | undefined

const filteredDeals = computed(() => {
  let result = [...deals.value]
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(d => d.title.toLowerCase().includes(q) || d.store?.name?.toLowerCase().includes(q))
  }
  if (userLocation.value) {
    result = result.map(d => ({ ...d, distanceKm: calcDistance(userLocation.value!.lat, userLocation.value!.lng, Number(d.latitude), Number(d.longitude)) })).sort((a: any, b: any) => a.distanceKm - b.distanceKm)
  }
  return result
})

onMounted(async () => {
  const q = route.query.search as string | undefined
  if (q) searchQuery.value = q
  await loadDeals()
  const saved = localStorage.getItem('foodly_location')
  if (saved) {
    try { const loc = JSON.parse(saved); userLocation.value = loc; showLocationPrompt.value = false } catch { /* */ }
  }
  await nextTick()
  initMap()
  if (saved) { drawUserMarker(); centerMap(userLocation.value!.lat, userLocation.value!.lng) }

  const socket = getSocket()
  socket.on('deal:created', (deal: Deal) => { deals.value = [deal, ...deals.value]; scheduleMarkerUpdate() })
  socket.on('deal:quantity', (p: { id: string; remaining: number }) => {
    const d = deals.value.find(i => i.id === p.id); if (d) d.remainingQuantity = p.remaining
  })
})

onUnmounted(() => {
  window.clearTimeout(searchTimer)
  getSocket().off('deal:created'); getSocket().off('deal:quantity')
  map.value?.remove()
})

watch(searchQuery, () => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(loadDeals, 250)
})

watch(filteredDeals, () => scheduleMarkerUpdate())

let markerUpdateTimer: number | undefined
function scheduleMarkerUpdate() {
  window.clearTimeout(markerUpdateTimer)
  markerUpdateTimer = window.setTimeout(rebuildMarkers, 50)
}

async function loadDeals() {
  isLoading.value = true; error.value = ''
  try {
    const params: Record<string, any> = { status: 'active', limit: 100 }
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim()
    const result = await dealsService.findAll(params)
    deals.value = result.deals || []
  } catch { deals.value = [] }
  finally { isLoading.value = false }
}

function initMap() {
  if (!mapContainer.value || map.value) return
  map.value = L.map(mapContainer.value, { center: [10.8231, 106.6297], zoom: 12, zoomControl: false })
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, attribution: '&copy; <a href="https://carto.com/">CARTO</a>' }).addTo(map.value)
  L.control.zoom({ position: 'topright' }).addTo(map.value)
  markerCluster.value = (L as any).markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 46, spiderfyOnMaxZoom: true, showCoverageOnHover: false, zoomToBoundsOnClick: true })
  map.value.addLayer(markerCluster.value)
  rebuildMarkers()
}

const markerMap = new Map<string, L.Marker>()

function createDealIcon(deal: Deal, selected = false) {
  const pct = deal.originalPrice && deal.discountPrice ? Math.round((1 - deal.discountPrice / deal.originalPrice) * 100) : 0
  const color = selected ? '#059669' : (deal.verified ? '#10b981' : '#ee4d2d')
  return L.divIcon({
    html: '<div class="deal-marker" style="--mc:' + color + '">' +
      '<span class="deal-marker-price">' + (pct > 0 ? '-' + pct + '%' : formatVND(Number(deal.discountPrice))) + '</span>' +
      '<span class="deal-marker-dot"></span></div>',
    className: '', iconSize: L.point(70, 34), iconAnchor: L.point(35, 34),
  })
}

function rebuildMarkers() {
  if (!markerCluster.value) return
  markerCluster.value.clearLayers()
  markerMap.clear()
  filteredDeals.value.slice(0, 80).forEach(deal => {
    const marker = L.marker([Number(deal.latitude), Number(deal.longitude)], { icon: createDealIcon(deal, selectedDeal.value?.id === deal.id) })
    marker.on('click', () => selectDeal(deal))
    markerMap.set(deal.id, marker); markerCluster.value.addLayer(marker)
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
  }).addTo(map.value).bindPopup('Your location')
}

function centerMap(lat: number, lng: number, zoom = 14) { map.value?.setView([lat, lng], zoom) }

async function locateUser() {
  isLocating.value = true; error.value = ''
  try {
    if (!navigator.geolocation) throw new Error('')
    const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 }))
    userLocation.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
    localStorage.setItem('foodly_location', JSON.stringify(userLocation.value))
    showLocationPrompt.value = false
    if (!map.value) await nextTick(initMap)
    drawUserMarker(); centerMap(userLocation.value.lat, userLocation.value.lng)
  } catch {
    const ip = await freeApis.detectLocation()
    if (ip) {
      userLocation.value = { lat: ip.lat, lng: ip.lng }
      localStorage.setItem('foodly_location', JSON.stringify(userLocation.value))
      showLocationPrompt.value = false
      if (!map.value) await nextTick(initMap)
      drawUserMarker(); centerMap(userLocation.value.lat, userLocation.value.lng)
    } else { error.value = 'Could not determine location. Please try again.' }
  } finally { isLocating.value = false }
}

function selectDeal(deal: Deal) { selectedDeal.value = deal; routeInfo.value = null; rebuildMarkers(); centerMap(Number(deal.latitude), Number(deal.longitude), 15) }
function deselectDeal() { selectedDeal.value = null; routeInfo.value = null; rebuildMarkers() }

async function buildRoute() {
  if (!selectedDeal.value || !userLocation.value) return
  isRouting.value = true; error.value = ''
  try {
    const profile = routeMode.value === 'walking' ? 'foot' : routeMode.value === 'cycling' ? 'cycling' : 'driving'
    const res = await fetch('https://router.project-osrm.org/route/v1/' + profile + '/' + userLocation.value.lng + ',' + userLocation.value.lat + ';' + selectedDeal.value.longitude + ',' + selectedDeal.value.latitude + '?geometries=geojson&overview=full')
    const data = await res.json()
    const r = data.routes?.[0]
    if (!r) throw new Error('')
    routeInfo.value = { distanceKm: r.distance / 1000, durationMin: r.duration / 60 }
    drawRoute(r.geometry)
  } catch { error.value = 'Could not calculate directions' }
  finally { isRouting.value = false }
}

function drawRoute(geo: any) {
  if (!map.value) return
  if (routeLine.value) map.value.removeLayer(routeLine.value)
  const coords = geo.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number])
  routeLine.value = L.polyline(coords, { color: '#ee4d2d', weight: 4, opacity: 0.85 }).addTo(map.value)
  map.value.fitBounds(routeLine.value.getBounds().pad(0.15))
}

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = (v: number) => v * Math.PI / 180
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(v?: number) { return v === undefined ? '' : v < 1 ? Math.round(v * 1000) + 'm' : v.toFixed(1) + 'km' }
function discountPct(d: any) { return d.originalPrice && d.discountPrice ? Math.round((1 - d.discountPrice / d.originalPrice) * 100) : 0 }

function handleAllowLocation() { locateUser() }
function handleSkipLocation() {
  showLocationPrompt.value = false
  userLocation.value = { lat: 10.8231, lng: 106.6297 }
  localStorage.setItem('foodly_location', JSON.stringify(userLocation.value))
  if (!map.value) return
  drawUserMarker(); centerMap(userLocation.value.lat, userLocation.value.lng, 13)
}
</script>

<template>
  <div class="explore-page">
    <div class="explore-toolbar">
      <div class="search-wrapper">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="searchQuery" type="search" placeholder="Search deals, stores..." class="toolbar-search" />
      </div>
      <button class="btn-map-toggle" :class="{ active: showMap }" @click="showMap = !showMap" :title="showMap ? 'Hide map' : 'Show map'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
      </button>
    </div>

    <div v-if="showLocationPrompt" class="location-overlay">
      <div class="location-dialog">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <h3>Enable location?</h3>
        <p>Find the best deals near you with location access.</p>
        <div class="location-actions">
          <button class="btn btn-primary" @click="handleAllowLocation">{{ isLocating ? 'Locating...' : 'Enable' }}</button>
          <button class="btn btn-outline" @click="handleSkipLocation">Use default location</button>
        </div>
      </div>
    </div>

    <div class="explore-layout">
      <div class="explore-list" :class="{ 'explore-list-full': !showMap }">
        <div v-if="isLoading" class="list-loading"><div v-for="n in 4" :key="n" class="skeleton"></div></div>
        <div v-else-if="filteredDeals.length === 0" class="empty-state"><h3>No deals found</h3><p>Try adjusting your search or filters.</p></div>
        <div v-else class="deals-list">
          <router-link v-for="deal in filteredDeals" :key="deal.id" :to="'/deals/' + deal.id" class="deal-card" @click.prevent="selectDeal(deal)">
            <div class="deal-card-img">
              <img :src="deal.images?.[0] || 'https://images.unsplash.com/photo-1586999768265-24af89630739?w=200&q=80'" :alt="deal.title" loading="lazy" />
              <span v-if="discountPct(deal) > 0" class="deal-discount">-{{ discountPct(deal) }}%</span>
            </div>
            <div class="deal-card-body">
              <div class="deal-store">{{ deal.store?.name || 'Store' }}</div>
              <h4 class="deal-title">{{ deal.title }}</h4>
              <div class="deal-meta">
                <span class="deal-price">{{ formatVND(deal.discountPrice) }}</span>
                <span v-if="deal.originalPrice > deal.discountPrice" class="deal-original">{{ formatVND(deal.originalPrice) }}</span>
                <span v-if="deal.remainingQuantity <= 3" class="deal-low">Low stock</span>
              </div>
              <div class="deal-footer">
                <span v-if="userLocation" class="deal-distance">{{ formatDist(calcDistance(userLocation.lat, userLocation.lng, Number(deal.latitude), Number(deal.longitude))) }}</span>
                <span v-if="deal.verified" class="deal-badge">Verified</span>
              </div>
            </div>
          </router-link>
        </div>
      </div>

      <div v-show="showMap" class="map-section">
        <div ref="mapContainer" class="map-canvas"></div>
      <div v-if="selectedDeal" class="map-info-panel">
          <button class="info-close" @click="deselectDeal">&times;</button>
          <div class="info-row">
            <div class="info-thumb">
              <img :src="selectedDeal.images?.[0] || 'https://images.unsplash.com/photo-1586999768265-24af89630739?w=100&q=80'" :alt="selectedDeal.title" />
            </div>
            <div class="info-content">
              <h4>{{ selectedDeal.title }}</h4>
              <div class="info-store">{{ selectedDeal.store?.name || 'Store' }}</div>
              <div class="info-price">{{ formatVND(selectedDeal.discountPrice) }} <s v-if="selectedDeal.originalPrice > selectedDeal.discountPrice">{{ formatVND(selectedDeal.originalPrice) }}</s></div>
            </div>
          </div>
          <div class="info-meta">
            <span class="info-stock">{{ selectedDeal.remainingQuantity }} left</span>
            <span v-if="userLocation" class="info-dist">{{ formatDist(calcDistance(userLocation.lat, userLocation.lng, Number(selectedDeal.latitude), Number(selectedDeal.longitude))) }}</span>
          </div>
          <div class="info-actions">
            <router-link :to="'/deals/' + selectedDeal.id" class="btn btn-primary btn-sm">Details</router-link>
            <button class="btn btn-outline btn-sm" @click="buildRoute" :disabled="isRouting">{{ isRouting ? 'Routing...' : 'Directions' }}</button>
            <button class="btn-map-center" @click="centerMap(Number(selectedDeal.latitude), Number(selectedDeal.longitude), 16)" title="Center map">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
            </button>
          </div>
          <div v-if="routeInfo" class="info-route">{{ formatDist(routeInfo.distanceKm) }} &middot; {{ Math.round(routeInfo.durationMin) }} min</div>
        </div>
      </div>
    </div>
    <div v-if="error" class="error-bar">{{ error }}</div>
  </div>
</template>

<style scoped>
.explore-page { display: flex; flex-direction: column; height: calc(100vh - 56px); background: var(--color-bg); }
.explore-toolbar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-bottom: 1px solid var(--color-border); background: var(--color-bg); z-index: 10; }
.search-wrapper { display: flex; align-items: center; gap: 8px; flex: 1; padding: 8px 14px; border-radius: var(--radius-full); background: var(--color-bg-secondary); border: 1px solid var(--color-border); }
.search-wrapper:focus-within { border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(238,77,45,0.1); }
.search-wrapper svg { flex-shrink: 0; color: var(--color-text-tertiary); }
.toolbar-search { flex: 1; border: none; background: transparent; font-size: 0.875rem; color: var(--color-text); outline: none; }
.btn-map-toggle { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.btn-map-toggle.active { background: var(--color-accent-light); color: var(--color-accent); border-color: var(--color-accent); }
.explore-layout { display: flex; flex: 1; min-height: 0; }
.explore-list { width: 380px; overflow-y: auto; border-right: 1px solid var(--color-border); background: var(--color-bg); }
.explore-list-full { width: 100%; border-right: none; }
.list-loading { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.skeleton { height: 100px; border-radius: var(--radius-sm); background: var(--color-bg-tertiary); animation: skeleton-loading 1.5s ease infinite; }
.deals-list { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.deal-card { display: flex; gap: 14px; padding: 14px; border-radius: 12px; background: var(--color-card-bg); border: 1px solid var(--color-border); text-decoration: none; cursor: pointer; transition: all var(--transition-fast); box-shadow: var(--shadow-xs); }
.deal-card:hover { box-shadow: var(--shadow-card-hover); border-color: var(--color-accent-light); }
.deal-card:active { transform: scale(0.98); }
.deal-card-img { position: relative; width: 90px; height: 90px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: var(--color-bg-tertiary); }
.deal-card-img img { width: 100%; height: 100%; object-fit: cover; }
.deal-discount { position: absolute; top: 4px; left: 4px; padding: 2px 7px; background: var(--color-accent); color: white; font-size: 0.65rem; font-weight: 700; border-radius: 5px; box-shadow: 0 2px 6px rgba(238,77,45,0.3); }
.deal-card-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.deal-store { font-size: 0.7rem; color: var(--color-text-tertiary); font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; }
.deal-title { font-size: 0.875rem; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.deal-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.deal-price { font-size: 0.9375rem; font-weight: 700; color: var(--color-accent); }
.deal-original { font-size: 0.75rem; color: var(--color-text-tertiary); text-decoration: line-through; }
.deal-low { font-size: 0.65rem; padding: 2px 6px; background: #fef2f2; color: #dc2626; border-radius: 4px; font-weight: 600; }
.deal-footer { display: flex; align-items: center; gap: 8px; font-size: 0.7rem; color: var(--color-text-tertiary); margin-top: auto; }
.deal-badge { color: var(--color-success); font-weight: 600; gap: 4px; display: inline-flex; align-items: center; }
.deal-badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: var(--color-success); }
.map-section { flex: 1; position: relative; min-width: 0; background: var(--color-bg-secondary); }
.map-canvas { height: 100%; width: 100%; }
.map-info-panel { position: absolute; bottom: 16px; left: 16px; right: 16px; background: var(--color-card-bg); border-radius: 14px; padding: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.18); border: 1px solid var(--color-border); z-index: 1000; max-width: 360px; }
.info-close { position: absolute; top: 8px; right: 10px; background: none; border: none; font-size: 1.4rem; color: var(--color-text-tertiary); cursor: pointer; line-height: 1; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all var(--transition-fast); }
.info-close:hover { background: var(--color-bg-secondary); color: var(--color-text); }
.info-row { display: flex; gap: 12px; margin-bottom: 10px; }
.info-thumb { width: 64px; height: 64px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: var(--color-bg-tertiary); }
.info-thumb img { width: 100%; height: 100%; object-fit: cover; }
.info-content { flex: 1; min-width: 0; }
.info-content h4 { font-size: 0.9375rem; font-weight: 600; margin-bottom: 2px; padding-right: 20px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.info-store { font-size: 0.75rem; color: var(--color-text-tertiary); margin-bottom: 4px; }
.info-price { font-size: 1rem; font-weight: 700; color: var(--color-accent); }
.info-price s { font-size: 0.75rem; color: var(--color-text-tertiary); font-weight: 400; margin-left: 6px; }
.info-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; font-size: 0.8rem; color: var(--color-text-secondary); }
.info-actions { display: flex; gap: 6px; }
.info-actions .btn { flex: 1; padding: 7px 12px; font-size: 0.8125rem; }
.btn-map-center { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all var(--transition-fast); }
.btn-map-center:hover { border-color: var(--color-accent); color: var(--color-accent); background: var(--color-accent-light); }
.info-route { margin-top: 8px; text-align: center; font-size: 0.8125rem; color: var(--color-accent); font-weight: 600; }
.location-overlay { position: fixed; inset: 0; z-index: 9999; background: var(--color-overlay); display: flex; align-items: center; justify-content: center; padding: 20px; }
.location-dialog { background: var(--color-card-bg); border-radius: 14px; padding: 36px 28px 28px; max-width: 360px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.location-dialog h3 { font-size: 1.2rem; font-weight: 600; margin: 12px 0 8px; color: var(--color-text); }
.location-dialog p { color: var(--color-text-secondary); margin-bottom: 24px; font-size: 0.9rem; }
.location-actions { display: flex; flex-direction: column; gap: 8px; }
.location-actions .btn { width: 100%; }
.error-bar { padding: 8px 16px; color: #92400e; background: #fffbeb; border-bottom: 1px solid #fde68a; font-size: 0.875rem; }
.empty-state { text-align: center; padding: 40px 16px; color: var(--color-text-secondary); }
.empty-state h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 6px; color: var(--color-text); }
</style>

<style>
/* -- Map markers style -- */
.deal-marker { display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25)); transition: transform 0.15s; }
.deal-marker:hover { transform: scale(1.1); z-index: 1000 !important; }
.deal-marker-price { display: inline-flex; align-items: center; padding: 3px 10px; background: white; border: 2px solid var(--mc, #ee4d2d); border-radius: 14px; font-size: 11px; font-weight: 700; color: var(--mc, #ee4d2d); white-space: nowrap; box-shadow: 0 1px 4px rgba(0,0,0,0.15); transition: all 0.2s; }
.deal-marker-dot { width: 8px; height: 8px; background: var(--mc, #ee4d2d); border: 2.5px solid white; border-radius: 50%; margin-top: -5px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
/* -- User location marker -- */
.user-loc-marker { position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
.user-loc-pulse { position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(59,130,246,0.2); animation: user-pulse 2s ease infinite; }
.user-loc-dot { width: 14px; height: 14px; border-radius: 50%; background: #3b82f6; border: 3px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.3); position: relative; z-index: 1; }
@keyframes user-pulse { 0% { transform: scale(0.8); opacity: 0.6; } 50% { transform: scale(1.5); opacity: 0.2; } 100% { transform: scale(0.8); opacity: 0.6; } }
</style>
