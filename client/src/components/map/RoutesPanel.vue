<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, shallowRef, nextTick } from 'vue'
import { useDirections } from '../../composables/useDirections'
import type * as LeafletNs from 'leaflet'

let leafletLib: typeof LeafletNs | null = null
async function getLeaflet(): Promise<typeof LeafletNs> {
  if (!leafletLib) {
    const mod = await import('leaflet')
    await import('leaflet/dist/leaflet.css')
    leafletLib = mod
  }
  return leafletLib
}

const props = defineProps<{
  destinationLat: number
  destinationLng: number
  destinationName: string
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const {
  userLocation,
  routes,
  isLoading,
  error,
  selectedRouteId,
  selectedRoute,
  profile,
  getUserLocation,
  calculateRoutes,
  setProfile,
} = useDirections()

const mapContainer = ref<HTMLDivElement | null>(null)
const miniMap = shallowRef<LeafletNs.Map | null>(null)
const routeLayers = shallowRef<LeafletNs.Polyline[]>([])
const originMarker = shallowRef<LeafletNs.CircleMarker | null>(null)
const destMarker = shallowRef<LeafletNs.Marker | null>(null)

const profileOptions = [
  { id: 'driving', label: 'Drive', icon: '🚗' },
  { id: 'walking', label: 'Walk', icon: '🚶' },
  { id: 'cycling', label: 'Cycle', icon: '🚲' },
] as const

onMounted(async () => {
  if (props.visible) {
    await nextTick()
    await initMiniMap()
    await getUserLocation()
    await calculateRoutes(props.destinationLat, props.destinationLng)
  }
})

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      await nextTick()
      await initMiniMap()
      await getUserLocation()
      await calculateRoutes(props.destinationLat, props.destinationLng)
    }
  }
)

watch(profile, async () => {
  await calculateRoutes(props.destinationLat, props.destinationLng)
})

watch(selectedRouteId, () => {
  redraw()
})
watch(
  () => routes.value,
  () => {
    redraw()
  }
)

async function initMiniMap() {
  if (!mapContainer.value || miniMap.value) return
  const L = await getLeaflet()
  miniMap.value = L.map(mapContainer.value, {
    center: [10.8231, 106.6297],
    zoom: 13,
    zoomControl: false,
    attributionControl: false,
  })
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  }).addTo(miniMap.value)
  drawMarkers()
  drawRoutes()
}

function drawMarkers() {
  if (!miniMap.value) return
  const L = leafletLib
  if (!L) return
  if (originMarker.value) {
    miniMap.value.removeLayer(originMarker.value)
    originMarker.value = null
  }
  if (destMarker.value) {
    miniMap.value.removeLayer(destMarker.value)
    destMarker.value = null
  }

  const origin = userLocation.value
  originMarker.value = L.circleMarker([origin.lat, origin.lng], {
    radius: 7,
    color: 'var(--color-accent, #10b981)',
    fillColor: 'var(--color-accent, #10b981)',
    fillOpacity: 1,
  })
    .addTo(miniMap.value)
    .bindPopup('You')

  destMarker.value = L.marker([props.destinationLat, props.destinationLng])
    .addTo(miniMap.value)
    .bindPopup(props.destinationName)
}

function drawRoutes() {
  if (!miniMap.value) return
  const L = leafletLib
  if (!L) return
  routeLayers.value.forEach((l) => {
    miniMap.value?.removeLayer(l)
  })
  routeLayers.value = []

  routes.value.forEach((r) => {
    const isSelected = r.id === selectedRouteId.value
    const line = L.polyline(r.polyline, {
      color: isSelected ? 'var(--color-accent, #10b981)' : 'var(--color-border, #d1d5db)',
      weight: isSelected ? 4 : 2,
      opacity: isSelected ? 0.9 : 0.4,
      dashArray: isSelected ? undefined : '6,6',
    }).addTo(miniMap.value!)
    routeLayers.value.push(line)
  })

  const points = routes.value.flatMap((r) => r.polyline)
  if (points.length >= 2) {
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]))
    miniMap.value.fitBounds(bounds.pad(0.25))
  } else if (miniMap.value) {
    miniMap.value.setView([userLocation.value.lat, userLocation.value.lng], 13)
  }
}

function redraw() {
  if (!miniMap.value) return
  drawRoutes()
}

onUnmounted(() => {
  routeLayers.value.forEach((l) => miniMap.value?.removeLayer(l))
  routeLayers.value = []
  miniMap.value?.remove()
  miniMap.value = null
})

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}
</script>

<template>
  <transition name="slide-up">
    <div v-if="visible" v-focus-trap class="routes-panel" role="dialog" aria-label="Directions" aria-modal="true">
      <div class="routes-header">
        <h3>
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
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Directions to {{ destinationName }}
        </h3>
        <button class="close-btn" @click="emit('close')" aria-label="Close directions">&times;</button>
      </div>

      <div class="mode-switch" role="group" aria-label="Travel mode">
        <button
          v-for="opt in profileOptions"
          :key="opt.id"
          class="mode-btn"
          :class="{ active: profile === opt.id }"
          :aria-pressed="profile === opt.id"
          @click="setProfile(opt.id)"
        >
          <span class="mode-icon" aria-hidden="true">{{ opt.icon }}</span>
          {{ opt.label }}
        </button>
      </div>

      <!-- Mini Map -->
      <div class="mini-map">
        <div ref="mapContainer" class="mini-map-canvas"></div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="routes-loading">
        <div class="skeleton" style="height: 60px; border-radius: var(--radius-md)"></div>
        <div class="skeleton" style="height: 60px; border-radius: var(--radius-md); width: 80%"></div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="routes-error">{{ error }}</div>

      <!-- Route List -->
      <div v-else class="routes-list">
        <div v-if="routes.length === 0" class="empty-state" style="padding: 20px">
          <p>No routes available</p>
        </div>
        <button
          v-for="route in routes"
          :key="route.id"
          class="route-card"
          :class="{ selected: route.id === selectedRouteId }"
          @click="selectedRouteId = route.id"
        >
          <div class="route-rank">{{ route.id }}</div>
          <div class="route-info">
            <div class="route-name">{{ route.name }}</div>
            <div class="route-summary">{{ route.summary || 'Via city roads' }}</div>
          </div>
          <div class="route-stats">
            <span class="route-duration">{{ formatDuration(route.durationValue) }}</span>
            <span class="route-distance">{{ route.distance }}</span>
          </div>
          <div v-if="route.id === 1" class="route-badge">Fastest</div>
        </button>
      </div>

      <!-- Selected Route Summary -->
      <div v-if="selectedRoute" class="route-summary-bar">
        <div class="summary-icon" aria-hidden="true">🚗</div>
        <div class="summary-text">
          <strong>{{ formatDuration(selectedRoute.durationValue) }}</strong>
          <span>{{ selectedRoute.distance }} via {{ selectedRoute.summary || 'city roads' }}</span>
        </div>
        <a
          :href="`https://www.google.com/maps/dir/${userLocation?.lat},${userLocation?.lng}/${destinationLat},${destinationLng}`"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-primary btn-sm"
        >
          Open in Maps
        </a>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.routes-panel {
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-top: 16px;
}

.routes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.routes-header h3 {
  font-size: 1rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text-tertiary);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
}

.close-btn:hover {
  background: var(--color-bg-tertiary);
}

.mode-switch {
  display: flex;
  gap: 6px;
  padding: 12px 20px 0;
}

.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card-bg);
  color: var(--color-text);
  font-family: var(--font-family);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mode-btn:hover {
  border-color: var(--color-accent);
}

.mode-btn.active {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
  color: var(--color-accent);
  font-weight: 600;
}

.mode-icon {
  font-size: 1rem;
}

.mini-map {
  padding: 12px;
}

.mini-map-canvas {
  width: 100%;
  height: 180px;
  border-radius: var(--radius-md);
  background: var(--color-bg-tertiary);
}

.routes-loading {
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.routes-error {
  padding: 12px 20px;
  color: var(--color-error);
  font-size: 0.875rem;
}

.routes-list {
  padding: 0 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.route-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card-bg);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
  font-family: var(--font-family);
  width: 100%;
  position: relative;
}

.route-card:hover {
  border-color: var(--color-accent);
}

.route-card.selected {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}

.route-rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  font-weight: 700;
  flex-shrink: 0;
}

.route-card.selected .route-rank {
  background: var(--color-accent);
  color: white;
}

.route-info {
  flex: 1;
}

.route-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
}

.route-summary {
  font-size: 0.8125rem;
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.route-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.route-duration {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
}

.route-distance {
  font-size: 0.8125rem;
  color: var(--color-text-tertiary);
}

.route-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  padding: 2px 8px;
  background: var(--color-success);
  color: white;
  border-radius: 100px;
  font-size: 0.6875rem;
  font-weight: 700;
}

.route-summary-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.summary-icon {
  font-size: 1.5rem;
}

.summary-text {
  flex: 1;
}

.summary-text strong {
  display: block;
  font-size: 1rem;
  color: var(--color-text);
}

.summary-text span {
  display: block;
  font-size: 0.8125rem;
  color: var(--color-text-tertiary);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
