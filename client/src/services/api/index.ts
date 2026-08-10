import api from './axios'

export { api as http }
import type { User } from '../../types'

export const authService = {
  async register(
    email: string,
    username: string,
    password: string,
    firstName?: string,
    lastName?: string,
    role: 'user' | 'merchant' = 'user'
  ) {
    const { data } = await api.post('/auth/register', { email, username, password, firstName, lastName, role })
    return data
  },

  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })
    return data
  },

  async getProfile(): Promise<User> {
    const { data } = await api.get('/auth/me')
    return data
  },

  async updateProfile(data: Partial<User>) {
    const { data: result } = await api.put('/auth/me', data)
    return result
  },
}

export const supportService = {
  async createTicket(payload: { category?: string; subject?: string; message: string }) {
    const { data } = await api.post('/support/tickets', payload)
    return data
  },
  async createFeedback(payload: { rating: number; category?: string; refCode?: string }) {
    const { data } = await api.post('/support/feedback', payload)
    return data
  },
}

export const dealsService = {
  async findAll(params?: any) {
    const { data } = await api.get('/deals', { params })
    return data
  },

  async findMapDeals(params: any) {
    const { data } = await api.get('/deals/map', { params })
    return data
  },

  async findMine() {
    const { data } = await api.get('/deals/mine')
    return data
  },

  async findById(id: string) {
    const { data } = await api.get(`/deals/${id}`)
    return data
  },

  async create(deal: any) {
    const { data } = await api.post('/deals', deal)
    return data
  },

  async update(id: string, deal: any) {
    const { data } = await api.put(`/deals/${id}`, deal)
    return data
  },

  async remove(id: string) {
    const { data } = await api.delete(`/deals/${id}`)
    return data
  },

  async toggleLike(id: string) {
    const { data } = await api.post(`/deals/${id}/like`)
    return data
  },

  async toggleBookmark(id: string) {
    const { data } = await api.post(`/deals/${id}/bookmark`)
    return data
  },

  async verify(id: string, action: string, notes?: string) {
    const { data } = await api.post(`/deals/${id}/verify`, { action, notes })
    return data
  },
}

export const reservationsService = {
  async reserve(dealId: string) {
    const { data } = await api.post(`/deals/${dealId}/reserve`)
    return data
  },

  async myReservations() {
    const { data } = await api.get('/reservations')
    return data
  },

  async confirm(id: string) {
    const { data } = await api.put(`/reservations/${id}/confirm`)
    return data
  },

  async cancel(id: string) {
    const { data } = await api.delete(`/reservations/${id}`)
    return data
  },
}

export const commentsService = {
  async findByDeal(dealId: string) {
    const { data } = await api.get(`/deals/${dealId}/comments`)
    return data
  },

  async create(dealId: string, content: string, parentId?: string) {
    const { data } = await api.post(`/deals/${dealId}/comments`, { content, parentId })
    return data
  },

  async update(id: string, content: string) {
    const { data } = await api.put(`/comments/${id}`, { content })
    return data
  },

  async remove(id: string) {
    const { data } = await api.delete(`/comments/${id}`)
    return data
  },
}

export const storesService = {
  async findAll() {
    const { data } = await api.get('/stores')
    return data
  },
}

export const newsService = {
  async findAll(params?: any) {
    const { data } = await api.get('/news', { params })
    return data
  },
}

export const aiService = {
  async searchByImage(file: File) {
    const form = new FormData()
    form.append('image', file)
    const { data } = await api.post('/ai/search', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
}

export const recommendationsService = {
  async getRecommendations(params?: { lat?: number; lng?: number; limit?: number }) {
    const { data } = await api.get('/recommendations', { params })
    return data
  },
}

export const interactionsService = {
  async record(dealId: string, action: string) {
    const { data } = await api.post('/interactions', { dealId, action })
    return data
  },
  async recordAnonymous(dealId: string, action: string) {
    const { data } = await api.post('/interactions/anonymous', { dealId, action })
    return data
  },
}

export const analyticsService = {
  async getLive() {
    const { data } = await api.get('/analytics/live')
    return data
  },
}

export const adminService = {
  async getDashboard() {
    const { data } = await api.get('/admin/dashboard')
    return data
  },

  async findUsers() {
    const { data } = await api.get('/users')
    return data
  },

  async getReviewDeals() {
    const { data } = await api.get('/admin/deals/review')
    return data
  },

  async banUser(id: string) {
    const { data } = await api.put(`/admin/users/${id}/ban`)
    return data
  },

  async changeUserRole(id: string, role: string) {
    const { data } = await api.put(`/admin/users/${id}/role`, { role })
    return data
  },
}

export const paymentsService = {
  async create(reservationId: string, provider = 'mock') {
    const { data } = await api.post(`/payments/reservations/${reservationId}/pay`, { provider })
    return data
  },
  async myPayments() {
    const { data } = await api.get('/payments')
    return data
  },
  async findById(id: string) {
    const { data } = await api.get(`/payments/${id}`)
    return data
  },
  async completeMock(id: string) {
    const { data } = await api.put(`/payments/${id}/complete-mock`)
    return data
  },
}

export const merchantService = {
  async getProfile() {
    const { data } = await api.get('/merchant/profile')
    return data
  },
  async getDashboard() {
    const { data } = await api.get('/merchant/dashboard')
    return data
  },
  async getOrders(status?: string) {
    const { data } = await api.get('/merchant/orders', { params: status ? { status } : {} })
    return data
  },
  async confirmOrder(id: string) {
    const { data } = await api.put(`/merchant/orders/${id}/confirm`)
    return data
  },
  async getDeals() {
    const { data } = await api.get('/merchant/deals')
    return data
  },
  async setDealActive(id: string, active: boolean) {
    const { data } = await api.put(`/merchant/deals/${id}/status`, { active })
    return data
  },
}

export const rewardsService = {
  async getImpact() {
    const { data } = await api.get('/rewards/impact')
    return data
  },
  async getBalance() {
    const { data } = await api.get('/rewards/balance')
    return data
  },
  async getSpinStatus() {
    const tzOffsetMinutes = new Date().getTimezoneOffset()
    const { data } = await api.get('/rewards/daily-spin/status', { params: { tzOffsetMinutes } })
    return data
  },
  async dailySpin() {
    const tzOffsetMinutes = new Date().getTimezoneOffset()
    const { data } = await api.post('/rewards/daily-spin', { tzOffsetMinutes })
    return data
  },
  async redeem(points: number) {
    const { data } = await api.post('/rewards/redeem', { points })
    return data
  },
}
