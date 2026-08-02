import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import { SocketGateway } from '../socket/socket.gateway'

@Injectable()
export class MerchantService {
  constructor(
    private supabase: SupabaseService,
    private socketGateway: SocketGateway,
  ) {}

  private async getStoreIds(userId: string): Promise<string[]> {
    const { data, error } = await this.supabase.client
      .from('stores')
      .select('id')
      .eq('user_id', userId)
    if (error) throw error
    return (data || []).map((s: any) => s.id)
  }

  async getProfile(userId: string) {
    const { data: user } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    const storeIds = await this.getStoreIds(userId)
    const stores = storeIds.length
      ? (await this.supabase.client.from('stores').select('*').in('id', storeIds)).data || []
      : []
    return { profile: user, stores, storeCount: stores.length }
  }

  async getDashboard(userId: string) {
    const storeIds = await this.getStoreIds(userId)
    if (storeIds.length === 0) return this.emptyDashboard()

    const { data: stores } = await this.supabase.client
      .from('stores')
      .select('id, name')
      .in('id', storeIds)
    const storeList = stores || []

    const { data: deals } = await this.supabase.client
      .from('deals')
      .select('*')
      .in('store_id', storeIds)
    const dealList = deals || []
    const dealIds = dealList.map((d: any) => d.id)

    if (dealIds.length === 0) return this.emptyDashboard()

    const { data: orders } = await this.supabase.client
      .from('reservations')
      .select('*, deal:deal_id(*, store:store_id(name))')
      .in('deal_id', dealIds)
      .order('reserved_at', { ascending: false })

    const orderList = orders || []
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const isToday = (d: string | null) => d && new Date(d) >= todayStart

    const confirmed = orderList.filter((o: any) => o.status === 'confirmed')
    const confirmedToday = confirmed.filter((o: any) => isToday(o.confirmed_at))
    const revenueOf = (o: any) => Number(o.deal?.discount_price || 0) * o.quantity_reserved
    const sumRevenue = (list: any[]) => list.reduce((s, o) => s + revenueOf(o), 0)

    const revenueToday = sumRevenue(confirmedToday)
    const itemsSold = confirmedToday.reduce((s: number, o: any) => s + o.quantity_reserved, 0)

    const lowStockDeals = dealList.filter(
      (d: any) => d.status === 'active' && d.remaining_quantity > 0 && d.remaining_quantity <= 5,
    )

    const recentOrders = orderList.slice(0, 10).map((o: any) => ({
      id: o.id,
      reservationCode: o.reservation_code,
      dealTitle: o.deal?.title || 'Unknown deal',
      storeName: o.deal?.store?.name || null,
      quantity: o.quantity_reserved,
      status: o.status,
      reservedAt: o.reserved_at,
      expiresAt: o.expires_at,
      confirmedAt: o.confirmed_at,
      amount: Math.round(Number(o.deal?.discount_price || 0) * o.quantity_reserved),
    }))

    const productMap = new Map<string, { title: string; sold: number }>()
    for (const o of confirmed) {
      const title = o.deal?.title
      if (!title) continue
      const cur = productMap.get(title) || { title, sold: 0 }
      cur.sold += o.quantity_reserved
      productMap.set(title, cur)
    }
    const topProducts = [...productMap.values()].sort((a, b) => b.sold - a.sold).slice(0, 8)

    const revenueTrend: { date: string; label: string; revenue: number; orders: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const day = new Date()
      day.setHours(0, 0, 0, 0)
      day.setDate(day.getDate() - i)
      const next = new Date(day)
      next.setDate(next.getDate() + 1)
      const dayOrders = confirmed.filter(
        (o: any) => o.confirmed_at && new Date(o.confirmed_at) >= day && new Date(o.confirmed_at) < next,
      )
      revenueTrend.push({
        date: day.toISOString(),
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: Math.round(sumRevenue(dayOrders)),
        orders: dayOrders.reduce((s: number, o: any) => s + o.quantity_reserved, 0),
      })
    }

    const pendingPickups = orderList.filter((o: any) => o.status === 'active').length

    return {
      stores: storeList,
      todayStats: {
        orders: orderList.filter((o: any) => isToday(o.reserved_at)).length,
        revenue: Math.round(revenueToday),
        itemsSold,
        pendingPickups,
        cancelled: orderList.filter((o: any) => o.status === 'cancelled').length,
      },
      activeDeals: dealList.filter((d: any) => d.status === 'active').length,
      totalDeals: dealList.length,
      lowStockDeals: lowStockDeals.map((d: any) => ({ id: d.id, title: d.title, remaining: d.remaining_quantity })),
      recentOrders,
      topProducts,
      revenueTrend,
    }
  }

  async getOrders(userId: string, status?: string) {
    const storeIds = await this.getStoreIds(userId)
    if (storeIds.length === 0) return []

    const { data: deals } = await this.supabase.client
      .from('deals')
      .select('id')
      .in('store_id', storeIds)
    const dealIds = (deals || []).map((d: any) => d.id)
    if (dealIds.length === 0) return []

    let query = this.supabase.client
      .from('reservations')
      .select('*, deal:deal_id(*, store:store_id(name))')
      .in('deal_id', dealIds)
      .order('reserved_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    return (data || []).map((o: any) => ({
      id: o.id,
      reservationCode: o.reservation_code,
      dealTitle: o.deal?.title || 'Unknown deal',
      dealId: o.deal_id,
      storeName: o.deal?.store?.name || null,
      quantity: o.quantity_reserved,
      status: o.status,
      reservedAt: o.reserved_at,
      expiresAt: o.expires_at,
      confirmedAt: o.confirmed_at,
      amount: Math.round(Number(o.deal?.discount_price || 0) * o.quantity_reserved),
    }))
  }

  async confirmPickup(userId: string, reservationId: string) {
    const storeIds = await this.getStoreIds(userId)
    if (storeIds.length === 0) throw new ForbiddenException('You do not own any stores')

    const { data: reservation, error } = await this.supabase.client
      .from('reservations')
      .select('*, deal:deal_id(store_id)')
      .eq('id', reservationId)
      .single()

    if (error || !reservation) throw new NotFoundException('Order not found')
    if (!storeIds.includes(reservation.deal?.store_id)) {
      throw new ForbiddenException('This order does not belong to your stores')
    }
    if (reservation.status !== 'active') {
      throw new BadRequestException('Only active orders can be confirmed')
    }

    const { data: updated, error: updateError } = await this.supabase.client
      .from('reservations')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', reservationId)
      .select()
      .single()
    if (updateError) throw updateError

    // Quantity was already decremented at reservation time (and restored on
    // cancel/expire), so confirming a pickup does not touch remaining_quantity.
    this.socketGateway.emitReservationConfirmed(reservationId)
    return updated
  }

  async getDeals(userId: string) {
    const storeIds = await this.getStoreIds(userId)
    if (storeIds.length === 0) return []

    const { data, error } = await this.supabase.client
      .from('deals')
      .select('*, store:store_id(name)')
      .in('store_id', storeIds)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      storeName: d.store?.name || null,
      status: d.status,
      verified: d.verified,
      remainingQuantity: d.remaining_quantity,
      originalQuantity: d.original_quantity,
      originalPrice: Number(d.original_price),
      discountPrice: Number(d.discount_price),
      expiresAt: d.expires_at,
      createdAt: d.created_at,
      image: d.images?.[0] || null,
    }))
  }

  async setDealActive(userId: string, dealId: string, active: boolean) {
    const storeIds = await this.getStoreIds(userId)
    if (storeIds.length === 0) throw new ForbiddenException('You do not own any stores')

    const { data: deal, error } = await this.supabase.client
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single()

    if (error || !deal) throw new NotFoundException('Deal not found')
    if (!storeIds.includes(deal.store_id)) {
      throw new ForbiddenException('This deal does not belong to your stores')
    }

    const { data: updated, error: updateError } = await this.supabase.client
      .from('deals')
      .update({ status: active ? 'active' : 'removed' })
      .eq('id', dealId)
      .select()
      .single()
    if (updateError) throw updateError

    this.socketGateway.emitDealUpdated(dealId, { status: updated.status })
    return updated
  }

  private emptyDashboard() {
    return {
      stores: [],
      todayStats: { orders: 0, revenue: 0, itemsSold: 0, pendingPickups: 0, cancelled: 0 },
      activeDeals: 0,
      totalDeals: 0,
      lowStockDeals: [],
      recentOrders: [],
      topProducts: [],
      revenueTrend: [],
    }
  }
}
