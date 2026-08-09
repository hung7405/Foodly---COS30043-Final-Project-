import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '../types'
import { authService } from '../services/api'
import { refreshSocketAuth } from '../services/socket/socket'

const DELIVERY_KEY = 'foodly:delivery'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const deliveryFallback = ref<string>(localStorage.getItem(DELIVERY_KEY) || '')

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isModerator = computed(() => user.value?.role === 'moderator' || user.value?.role === 'admin')
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isMerchant = computed(() => user.value?.role === 'merchant' || user.value?.role === 'admin')

  const deliveryAddress = computed(() => {
    const u: any = user.value
    return (u?.delivery_address ?? u?.deliveryAddress ?? '') || deliveryFallback.value
  })

  async function saveDeliveryAddress(address: string) {
    const trimmed = address.trim()
    deliveryFallback.value = trimmed
    localStorage.setItem(DELIVERY_KEY, trimmed)
    if (!token.value || !trimmed) return false
    try {
      const updated = await authService.updateProfile({ deliveryAddress: trimmed })
      user.value = updated.user ?? updated
      return true
    } catch {
      return false
    }
  }

  async function login(email: string, password: string) {
    isLoading.value = true
    error.value = null
    try {
      const result = await authService.login(email, password)
      token.value = result.token
      user.value = result.user
      localStorage.setItem('token', result.token)
      refreshSocketAuth()
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function register(email: string, username: string, password: string, firstName?: string, lastName?: string) {
    isLoading.value = true
    error.value = null
    try {
      const result = await authService.register(email, username, password, firstName, lastName)
      token.value = result.token
      user.value = result.user
      localStorage.setItem('token', result.token)
      refreshSocketAuth()
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Registration failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function fetchProfile() {
    if (!token.value) return
    try {
      user.value = await authService.getProfile()
    } catch {
      logout()
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    refreshSocketAuth()
  }

  function setUser(u: User) {
    user.value = u
  }

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    isModerator,
    isAdmin,
    isMerchant,
    deliveryAddress,
    saveDeliveryAddress,
    login,
    register,
    logout,
    fetchProfile,
    setUser,
  }
})
