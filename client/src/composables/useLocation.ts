import { ref, onUnmounted } from 'vue'

export type LocationPermission = 'granted' | 'denied' | 'prompt' | 'unsupported'

export interface Coords {
  lat: number
  lng: number
}

const DEFAULT_LOCATION: Coords = { lat: 10.8231, lng: 106.6297 }
const STORAGE_KEY = 'foodly_location'

function readCache(): Coords | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) {
      return { lat: parsed.lat, lng: parsed.lng }
    }
    return null
  } catch {
    return null
  }
}

function persist(coord: Coords) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coord))
  } catch {
    /* storage unavailable */
  }
}

/**
 * useLocation — reactive, continuously-tracking browser geolocation.
 *
 * Uses `navigator.geolocation.watchPosition` so the user's position keeps
 * updating as they move (this is the fix for a stale, one-shot position).
 * Also listens to `navigator.permissions` changes so the watcher starts and
 * stops automatically when the user toggles permission — no reload required.
 */
export function useLocation() {
  const userLocation = ref<Coords | null>(readCache())
  const permission = ref<LocationPermission>(userLocation.value ? 'granted' : 'prompt')
  const isWatching = ref(false)

  let watchId: number | null = null
  let pollStatus: PermissionStatus | null = null

  function updatePosition(loc: Coords) {
    userLocation.value = loc
    persist(loc)
  }

  function stopWatching() {
    // store-level stop — clears the active watch if any
    if (watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchId)
    }
    watchId = null
    isWatching.value = false
  }

  /**
   * Start continuous position tracking. `onUpdate` fires whenever the browser
   * reports a new (moved) position — hook this to move the map marker live.
   */
  function startWatching(onUpdate?: (loc: Coords) => void) {
    if (!('geolocation' in navigator)) return
    if (watchId !== null) stopWatching()
    // maximumAge: 0 forces the browser to re-resolve instead of serving the
    // last cached position, which is what kept the old location "stuck".
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        updatePosition(loc)
        onUpdate?.(loc)
      },
      () => {
        // Transient error — do not stop watching so the browser can re-fire
        // when it regains a fix. Only a denied permission stops the loop.
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    )
    isWatching.value = watchId !== null
  }

  /** One-shot position read (used to seed immediately + decide the prompt). */
  async function getOnce(): Promise<Coords | null> {
    if (!('geolocation' in navigator)) return null
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
        })
      )
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      updatePosition(loc)
      return loc
    } catch {
      return null
    }
  }

  /** Query + subscribe to the browser permission state. */
  async function resolvePermission(): Promise<LocationPermission> {
    if (!('geolocation' in navigator)) {
      permission.value = 'unsupported'
      return permission.value
    }
    if (navigator.permissions?.query) {
      try {
        pollStatus = await navigator.permissions.query({ name: 'geolocation' } as PermissionDescriptor)
        permission.value = pollStatus.state
        const handleChange = () => {
          if (!pollStatus) return
          permission.value = pollStatus.state
          if (pollStatus.state === 'granted') {
            // Start tracking again the moment the user grants access — no reload.
            startWatching()
          } else if (pollStatus.state === 'denied') {
            stopWatching()
          }
        }
        // Use the modern event-listener form where available, else onchange.
        if (typeof pollStatus.addEventListener === 'function') {
          pollStatus.addEventListener('change', handleChange)
        }
        // Store for cleanup (best-effort).
        ;(pollStatus as any).__foodlyLocationHandler = handleChange
      } catch {
        permission.value = 'prompt'
      }
    } else {
      permission.value = 'prompt'
    }
    return permission.value
  }

  function setDefault() {
    updatePosition({ ...DEFAULT_LOCATION })
  }

  onUnmounted(() => {
    if (watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
    const handler = (pollStatus as any)?.__foodlyLocationHandler
    if (pollStatus && handler && typeof pollStatus.removeEventListener === 'function') {
      pollStatus.removeEventListener('change', handler)
    }
  })

  return {
    userLocation,
    permission,
    isWatching,
    startWatching,
    stopWatching,
    getOnce,
    resolvePermission,
    setDefault,
  }
}