<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useDirections } from '../../composables/useDirections'

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
  getUserLocation,
  calculateRoutes,
} = useDirections()

onMounted(async () => {
  if (props.visible) {
    await getUserLocation()
    await calculateRoutes(props.destinationLat, props.destinationLng)
  }
})

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      await getUserLocation()
      await calculateRoutes(props.destinationLat, props.destinationLng)
    }
  }
)

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}
</script>

<template>
  <transition name="slide-up">
    <div v-if="visible" class="routes-panel" role="dialog" aria-label="Directions">
      <div class="routes-header">
        <h3>📍 Directions to {{ destinationName }}</h3>
        <button class="close-btn" @click="emit('close')" aria-label="Close directions">&times;</button>
      </div>

      <!-- Mini Map -->
      <div class="mini-map">
        <svg viewBox="0 0 400 200" class="route-svg">
          <!-- Background grid -->
          <rect width="400" height="200" fill="var(--color-bg-tertiary)" rx="8"/>
          <!-- Origin dot -->
          <circle cx="50" cy="150" r="8" fill="var(--color-accent)" stroke="white" stroke-width="2"/>
          <text x="50" y="140" text-anchor="middle" font-size="10" fill="var(--color-text)">You</text>
          <!-- Destination dot -->
          <circle cx="350" cy="40" r="8" fill="#10b981" stroke="white" stroke-width="2"/>
          <text x="350" y="30" text-anchor="middle" font-size="10" fill="var(--color-text)">Store</text>
          <!-- Route lines -->
          <template v-for="route in routes" :key="route.id">
            <path
                :d="'M' + route.polyline.map((p, i) => {
                const x = 50 + ((p.lng - (userLocation?.lng || 106.6297)) / 0.03) * 300
                const y = 150 - ((p.lat - (userLocation?.lat || 10.8231)) / 0.03) * 110
                return `${i === 0 ? '' : 'L'}${Math.max(10, Math.min(390, x))},${Math.max(10, Math.min(190, y))}`
              }).join(' ')"
              :stroke="route.id === selectedRouteId ? 'var(--color-accent)' : 'var(--color-border)'"
              :stroke-width="route.id === selectedRouteId ? 3 : 1.5"
              fill="none"
              stroke-linecap="round"
              stroke-dasharray="5,5"
              :opacity="route.id === selectedRouteId ? 1 : 0.4"
            />
          </template>
        </svg>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="routes-loading">
        <div class="skeleton" style="height:60px;border-radius:var(--radius-md)"></div>
        <div class="skeleton" style="height:60px;border-radius:var(--radius-md);width:80%"></div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="routes-error">{{ error }}</div>

      <!-- Route List -->
      <div v-else class="routes-list">
        <div v-if="routes.length === 0" class="empty-state" style="padding:20px">
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
            <div class="route-summary">{{ route.summary }}</div>
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
        <div class="summary-icon">🚗</div>
        <div class="summary-text">
          <strong>{{ formatDuration(selectedRoute.durationValue) }}</strong>
          <span>{{ selectedRoute.distance }} via {{ selectedRoute.summary }}</span>
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

.mini-map {
  padding: 12px;
}

.route-svg {
  width: 100%;
  height: 180px;
  border-radius: var(--radius-md);
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
