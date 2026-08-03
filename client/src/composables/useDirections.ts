import { ref, computed } from 'vue'
import { freeApis } from '../services/freeApis'
import type { RouteProfile } from '../services/freeApis'

export interface RouteOption {
  id: number
  name: string
  distance: string
  distanceValue: number
  duration: string
  durationValue: number
  summary: string
  polyline: { lat: number; lng: number }[]
}

export function useDirections() {
  const userLocation = ref<{ lat: number; lng: number }>({ lat: 10.8231, lng: 106.6297 })
  const routes = ref<RouteOption[]>([])
  const isLoading = ref(false)
  const selectedRouteId = ref<number | null>(null)
  const error = ref('')
  const profile = ref<RouteProfile>('driving')

  async function getUserLocation() {
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
          })
        )
        userLocation.value = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
      } catch {
        // Fallback to HCMC District 1
        userLocation.value = { lat: 10.8231, lng: 106.6297 }
      }
    }
  }

  async function calculateRoutes(destLat: number, destLng: number) {
    isLoading.value = true
    error.value = ''

    try {
      const legs = await freeApis.getRoutes(
        [userLocation.value.lat, userLocation.value.lng],
        [destLat, destLng],
        profile.value,
      )

      if (legs.length > 0) {
        routes.value = legs.map((r, i) => ({
          id: i + 1,
          name: i === 0 ? 'Recommended' : `Option ${i + 1}`,
          distance: `${r.distanceKm.toFixed(1)} km`,
          distanceValue: r.distanceKm * 1000,
          duration: `${Math.round(r.durationMin)} min`,
          durationValue: r.durationMin * 60,
          summary: r.summary || '',
          polyline: (r.geometry?.coordinates || []).map((c: number[]) => ({ lat: c[1], lng: c[0] })),
        }))
      } else {
        // OSRM failed — generate mock routes
        routes.value = generateMockRoutes(userLocation.value, { lat: destLat, lng: destLng })
      }

      if (routes.value.length > 0) {
        selectedRouteId.value = routes.value[0].id
      }
    } catch {
      error.value = 'Could not calculate routes. Showing estimated routes.'
      routes.value = generateMockRoutes(userLocation.value, { lat: destLat, lng: destLng })
    } finally {
      isLoading.value = false
    }
  }

  function setProfile(next: RouteProfile) {
    if (profile.value === next) return
    profile.value = next
  }

  const selectedRoute = computed(() =>
    routes.value.find((r) => r.id === selectedRouteId.value) || routes.value[0]
  )

  return {
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
  }
}

function generateMockRoutes(from: { lat: number; lng: number }, to: { lat: number; lng: number }): RouteOption[] {
  const latDiff = to.lat - from.lat
  const lngDiff = to.lng - from.lng
  const baseDist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000 // rough meters

  return [
    {
      id: 1, name: 'Via Main Street',
      distance: `${(baseDist / 1000).toFixed(1)} km`,
      distanceValue: baseDist,
      duration: `${Math.round(baseDist / 80 / 60)} min`,
      durationValue: baseDist / 80,
      summary: 'A-road, traffic-free',
      polyline: generatePolyline(from, to, 0),
    },
    {
      id: 2, name: 'Via Express Lane',
      distance: `${((baseDist * 1.1) / 1000).toFixed(1)} km`,
      distanceValue: baseDist * 1.1,
      duration: `${Math.round(baseDist / 90 / 60)} min`,
      durationValue: baseDist / 90,
      summary: 'Motorway, faster but longer',
      polyline: generatePolyline(from, to, 0.02),
    },
    {
      id: 3, name: 'Scenic Route',
      distance: `${((baseDist * 1.3) / 1000).toFixed(1)} km`,
      distanceValue: baseDist * 1.3,
      duration: `${Math.round(baseDist / 60 / 60)} min`,
      durationValue: baseDist / 60,
      summary: 'Local roads, scenic drive',
      polyline: generatePolyline(from, to, -0.02),
    },
    {
      id: 4, name: 'Via Park Road',
      distance: `${((baseDist * 1.15) / 1000).toFixed(1)} km`,
      distanceValue: baseDist * 1.15,
      duration: `${Math.round(baseDist / 70 / 60)} min`,
      durationValue: baseDist / 70,
      summary: 'Suburban streets',
      polyline: generatePolyline(from, to, 0.01),
    },
    {
      id: 5, name: 'Via Riverside',
      distance: `${((baseDist * 1.4) / 1000).toFixed(1)} km`,
      distanceValue: baseDist * 1.4,
      duration: `${Math.round(baseDist / 55 / 60)} min`,
      durationValue: baseDist / 55,
      summary: 'River road, less traffic',
      polyline: generatePolyline(from, to, -0.015),
    },
  ]
    .slice(0, 5)
    .sort((a, b) => a.durationValue - b.durationValue)
    .map((route, idx) => ({ ...route, id: idx + 1, name: idx === 0 ? '✨ Fastest' : `Option ${idx + 1}` }))
}

function generatePolyline(from: { lat: number; lng: number }, to: { lat: number; lng: number }, offset: number) {
  const steps = 10
  const points: { lat: number; lng: number }[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const midOffset = Math.sin(t * Math.PI) * offset
    points.push({
      lat: from.lat + (to.lat - from.lat) * t + midOffset * 0.5,
      lng: from.lng + (to.lng - from.lng) * t + midOffset,
    })
  }
  return points
}
