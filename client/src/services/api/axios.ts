import axios from 'axios'
import { useUiStore } from '../../stores/ui.store'

const toCamel = (str: string) => str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())

function mapKeys(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(mapKeys)
  if (data && typeof data === 'object') {
    return Object.keys(data).reduce(
      (acc, key) => {
        const value = (data as Record<string, unknown>)[key]
        acc[toCamel(key)] = mapKeys(value)
        return acc
      },
      {} as Record<string, unknown>
    )
  }
  return data
}

function pickUrl(raw: string | undefined, fallback: string): string {
  const value = (raw || '').trim()
  if (/^https?:\/\//i.test(value) && !/^vite_/i.test(value)) {
    const host = value
      .replace(/^https?:\/\//i, '')
      .split(/[/:]/)[0]
      .toLowerCase()
    if (!import.meta.env.PROD || (host !== 'localhost' && host !== '127.0.0.1')) return value
  }
  return fallback
}

const DEFAULT_API_URL = import.meta.env.PROD
  ? 'https://foodly-cos30043-final-project.onrender.com/api'
  : 'http://localhost:3000/api'

const api = axios.create({
  baseURL: pickUrl(import.meta.env.VITE_API_URL, DEFAULT_API_URL),
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object') {
      response.data = mapKeys(response.data)
    }
    return response
  },
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    const message = error.response?.data?.message || error.message || 'Request failed'
    useUiStore().addToast(typeof message === 'string' ? message : message[0] || 'Request failed')
    return Promise.reject(error)
  }
)

export default api
