const IP_WHO_URL = 'https://ipwho.is/'
const QR_API_URL = 'https://api.qrserver.com/v1/create-qr-code'
const OSRM_URL = 'https://router.project-osrm.org/route/v1'
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'

export interface RouteLeg {
  distanceKm: number
  durationMin: number
  geometry: { type: 'LineString'; coordinates: number[][] }
  summary?: string
}

export type RouteProfile = 'driving' | 'walking' | 'cycling'

const PROFILE_MAP: Record<RouteProfile, string> = { driving: 'driving', walking: 'foot', cycling: 'cycling' }

async function fetchOSRM(
  profile: RouteProfile,
  origin: [number, number],
  destination: [number, number],
  alternatives = false
) {
  const url =
    `${OSRM_URL}/${PROFILE_MAP[profile]}/${origin[1]},${origin[0]};${destination[1]},${destination[0]}` +
    `?geometries=geojson&overview=full&steps=false${alternatives ? '&alternatives=3' : ''}`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.routes) ? data.routes : []
  } catch {
    return []
  }
}

function toRoute(r: any): RouteLeg {
  return {
    distanceKm: r.distance / 1000,
    durationMin: r.duration / 60,
    geometry: r.geometry,
    summary: r.legs?.[0]?.summary || '',
  }
}

export const freeApis = {
  async detectLocation() {
    try {
      const res = await fetch(IP_WHO_URL)
      if (!res.ok) return null
      const data = await res.json()
      if (data?.success === false) return null
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return { lat: data.latitude, lng: data.longitude, city: data.city, country: data.country }
      }
      return null
    } catch {
      return null
    }
  },

  qrCodeUrl(text: string, size = 300) {
    return `${QR_API_URL}?size=${size}x${size}&data=${encodeURIComponent(text)}`
  },

  async getRoute(
    origin: [number, number],
    destination: [number, number],
    profile: RouteProfile = 'driving'
  ): Promise<RouteLeg | null> {
    const routes = await fetchOSRM(profile, origin, destination, false)
    return routes[0] ? toRoute(routes[0]) : null
  },

  async getRoutes(
    origin: [number, number],
    destination: [number, number],
    profile: RouteProfile = 'driving'
  ): Promise<RouteLeg[]> {
    const routes = await fetchOSRM(profile, origin, destination, true)
    return routes.slice(0, 5).map(toRoute)
  },

  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const res = await fetch(
        `${NOMINATIM_URL}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=vi`
      )
      if (!res.ok) return null
      const data = await res.json()
      const a = data.address || {}
      const parts = [a.road || a.pedestrian || a.neighbourhood, a.suburb, a.city || a.town || a.village].filter(Boolean)
      return parts.length ? parts.slice(0, 2).join(', ') : data.display_name || null
    } catch {
      return null
    }
  },
}
