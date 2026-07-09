const IP_API_URL = 'https://ip-api.com/json'
const QR_API_URL = 'https://api.qrserver.com/v1/create-qr-code'
const OSRM_URL = 'https://router.project-osrm.org/route/v1'

export const freeApis = {
  async detectLocation() {
    try {
      const res = await fetch(`${IP_API_URL}?fields=status,country,city,lat,lon`)
      if (!res.ok) return null
      const data = await res.json()
      if (data.status === 'success') {
        return { lat: data.lat, lng: data.lon, city: data.city, country: data.country }
      }
      return null
    } catch {
      return null
    }
  },

  qrCodeUrl(text: string, size = 300) {
    return `${QR_API_URL}?size=${size}x${size}&data=${encodeURIComponent(text)}`
  },

  async getRoute(origin: [number, number], destination: [number, number], profile: 'driving' | 'walking' | 'cycling' = 'driving') {
    const profileMap = { driving: 'driving', walking: 'foot', cycling: 'cycling' }
    const url = `${OSRM_URL}/${profileMap[profile]}/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?geometries=geojson&overview=full&steps=false`
    try {
      const res = await fetch(url)
      const data = await res.json()
      const route = data.routes?.[0]
      if (!route) return null
      return {
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
        geometry: route.geometry,
      }
    } catch {
      return null
    }
  },
}
