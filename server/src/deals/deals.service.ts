import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import { Deal, DealStatus } from './entities/deal.entity'
import { CommentStatus } from '../comments/entities/comment.entity'
import { VerificationAction } from './entities/verification-event.entity'
import { InteractionAction } from '../interactions/entities/interaction.entity'
import { SocketGateway } from '../socket/socket.gateway'
import { AnalyticsService } from '../analytics/analytics.service'

@Injectable()
export class DealsService {
  constructor(
    private supabaseService: SupabaseService,
    private socketGateway: SocketGateway,
    private analyticsService: AnalyticsService,
  ) {}

  private get supabase() {
    return this.supabaseService.client
  }

  async findAll(query: {
    page?: number; limit?: number; search?: string; category?: string;
    sort?: string; order?: 'ASC' | 'DESC'; status?: string; verified?: string;
    lat?: number; lng?: number; radius?: number; userId?: string;
  }) {
    const page = Math.max(Number(query.page) || 1, 1)
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100)
    const sort = ['created_at', 'expires_at', 'discount_price', 'remaining_quantity', 'like_count'].includes(String(query.sort)) ? String(query.sort) : 'created_at'
    const order = String(query.order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    let supabaseQuery = this.supabase
      .from('deals')
      .select('*, user:user_id(*), store:stores(*)')

    if (query.status) supabaseQuery = supabaseQuery.eq('status', query.status)
    if (query.verified !== undefined) supabaseQuery = supabaseQuery.eq('verified', query.verified === 'true')
    if (query.userId) supabaseQuery = supabaseQuery.eq('user_id', query.userId)

    supabaseQuery = supabaseQuery.order(sort, { ascending: order === 'ASC' })

    const { data: deals, error } = await supabaseQuery

    if (error) throw error

    let filtered: any[] = deals || []

    if (query.search) {
      const s = String(query.search).toLowerCase()
      filtered = filtered.filter(deal =>
        deal.title.toLowerCase().includes(s) ||
        deal.description?.toLowerCase().includes(s) ||
        deal.store?.name?.toLowerCase().includes(s) ||
        deal.tags?.some((tag: string) => tag.toLowerCase().includes(s)),
      )
    }

    if (query.category && query.category !== 'All') {
      const c = String(query.category).toLowerCase()
      filtered = filtered.filter(deal => deal.tags?.some((tag: string) => tag.toLowerCase().includes(c)))
    }

    const lat = Number(query.lat)
    const lng = Number(query.lng)
    const radius = Number(query.radius || 5)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      filtered = filtered
        .map(deal => ({ ...deal, distanceKm: this.distanceKm(lat, lng, Number(deal.latitude), Number(deal.longitude)) }))
      filtered = filtered.filter((deal: any) => deal.distanceKm <= radius)
      filtered.sort((a: any, b: any) => a.distanceKm - b.distanceKm)
    }

    const total = filtered.length
    const paged = filtered.slice((page - 1) * limit, page * limit).map(deal => this.sanitizeDeal(deal))
    return { deals: paged, total, page, totalPages: Math.ceil(total / limit) }
  }

  async findMapDeals(swLat: number, swLng: number, neLat: number, neLng: number, status?: string) {
    let query = this.supabase
      .from('deals')
      .select('*, user:user_id(*), store:stores(*)')
      .eq('status', status || DealStatus.ACTIVE)

    if ([swLat, swLng, neLat, neLng].every(Number.isFinite)) {
      query = query
        .gte('latitude', Math.min(swLat, neLat))
        .lte('latitude', Math.max(swLat, neLat))
        .gte('longitude', Math.min(swLng, neLng))
        .lte('longitude', Math.max(swLng, neLng))
    }

    const { data: deals, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return (deals || []).map(deal => this.sanitizeDeal(deal))
  }

  async findById(id: string) {
    const { data: deal, error } = await this.supabase
      .from('deals')
      .select('*, user:user_id(*), store:stores(*), comments:comments(*, user:user_id(*))')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!deal) throw new NotFoundException('Deal not found')

    if (deal.comments) {
      deal.comments = deal.comments.filter((c: any) => c.status === CommentStatus.ACTIVE)
    }

    return this.sanitizeDeal(deal)
  }

  async findMine(userId: string) {
    return this.findAll({ userId, page: 1, limit: 100, sort: 'created_at', order: 'DESC' })
  }

  async create(data: Partial<Deal>, userId: string) {
    if (!data.title?.trim()) throw new BadRequestException('Title is required')
    if (!Number.isFinite(Number(data.discountPrice)) || Number(data.discountPrice) <= 0) throw new BadRequestException('Discount price must be greater than 0')
    if (!Number.isFinite(Number(data.originalPrice)) || Number(data.originalPrice) < Number(data.discountPrice)) throw new BadRequestException('Original price must be greater than discount price')
    if (!Number.isFinite(Number(data.latitude)) || !Number.isFinite(Number(data.longitude))) throw new BadRequestException('A valid location is required')

    const remainingQuantity = Math.max(Number(data.remainingQuantity) || 1, 1)
    const payload = {
      ...data,
      user_id: userId,
      title: data.title.trim(),
      original_price: Number(data.originalPrice),
      discount_price: Number(data.discountPrice),
      remaining_quantity: remainingQuantity,
      original_quantity: remainingQuantity,
      expires_at: data.expiresAt ? new Date(data.expiresAt).toISOString() : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      images: Array.isArray(data.images) ? data.images : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
    }

    const { data: saved, error } = await this.supabase
      .from('deals')
      .insert(payload)
      .select('*, user:user_id(*), store:stores(*)')
      .single()

    if (error) throw error

    this.socketGateway.emitDealCreated(this.sanitizeDeal(saved))
    this.analyticsService.recordEvent({ userId, eventType: 'deal_created', dealId: saved.id }).catch(() => {})

    return this.sanitizeDeal(saved)
  }

  async update(id: string, data: Partial<Deal>, userId: string, userRole: string) {
    const { data: deal, error: findError } = await this.supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (findError) throw findError
    if (!deal) throw new NotFoundException('Deal not found')
    if (deal.user_id !== userId && userRole !== 'admin' && userRole !== 'moderator') {
      throw new ForbiddenException('You can only edit your own deals')
    }

    const allowedFields = ['title', 'description', 'original_price', 'discount_price', 'remaining_quantity', 'images', 'tags', 'address', 'latitude', 'longitude', 'expires_at']
    const updates: any = {}
    for (const field of allowedFields) {
      if ((data as any)[field] !== undefined) {
        updates[field] = (data as any)[field]
      }
    }

    const { data: saved, error: updateError } = await this.supabase
      .from('deals')
      .update(updates)
      .eq('id', id)
      .select('*, user:user_id(*), store:stores(*)')
      .single()

    if (updateError) throw updateError

    this.socketGateway.emitDealUpdated(id, data)
    return this.sanitizeDeal(saved)
  }

  async remove(id: string, userId: string, userRole: string) {
    const { data: deal, error: findError } = await this.supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (findError) throw findError
    if (!deal) throw new NotFoundException('Deal not found')
    if (deal.user_id !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only delete your own deals')
    }

    const { data: saved, error: updateError } = await this.supabase
      .from('deals')
      .update({ status: DealStatus.REMOVED })
      .eq('id', id)
      .select('*, user:user_id(*), store:stores(*)')
      .single()

    if (updateError) throw updateError

    return this.sanitizeDeal(saved)
  }

  async verify(id: string, moderatorId: string, action: VerificationAction, notes?: string) {
    const { data: deal, error: findError } = await this.supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (findError) throw findError
    if (!deal) throw new NotFoundException('Deal not found')

    const { data: saved, error: updateError } = await this.supabase
      .from('deals')
      .update({
        verified: action === VerificationAction.VERIFIED,
        verified_by_id: moderatorId,
      })
      .eq('id', id)
      .select('*, user:user_id(*), store:stores(*)')
      .single()

    if (updateError) throw updateError

    const { error: eventError } = await this.supabase
      .from('verification_events')
      .insert({ deal_id: id, moderator_id: moderatorId, action, notes })

    if (eventError) throw eventError

    this.socketGateway.emitDealVerified(id, moderatorId)
    return this.sanitizeDeal(saved)
  }

  async toggleLike(dealId: string, userId: string) {
    const { data: existing } = await this.supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('target_id', dealId)
      .eq('target_type', 'deal')
      .maybeSingle()

    if (existing) {
      const { error: deleteError } = await this.supabase
        .from('likes')
        .delete()
        .eq('id', existing.id)

      if (deleteError) throw deleteError

      const { data: deal } = await this.supabase
        .from('deals')
        .select('like_count')
        .eq('id', dealId)
        .single()

      await this.supabase
        .from('deals')
        .update({ like_count: Math.max(0, (deal?.like_count || 0) - 1) })
        .eq('id', dealId)

      ;(async () => { try { await this.supabase.from('user_interactions').insert({ user_id: userId, deal_id: dealId, action: InteractionAction.UNLIKE }) } catch {} })()

      return { liked: false }
    }

    const { error: insertError } = await this.supabase
      .from('likes')
      .insert({ user_id: userId, target_id: dealId, target_type: 'deal' })

    if (insertError) throw insertError

    const { data: deal } = await this.supabase
      .from('deals')
      .select('like_count')
      .eq('id', dealId)
      .single()

    await this.supabase
      .from('deals')
      .update({ like_count: (deal?.like_count || 0) + 1 })
      .eq('id', dealId)

    ;(async () => { try { await this.supabase.from('user_interactions').insert({ user_id: userId, deal_id: dealId, action: InteractionAction.LIKE }) } catch {} })()

    return { liked: true }
  }

  async toggleBookmark(dealId: string, userId: string) {
    const { data: existing } = await this.supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('deal_id', dealId)
      .maybeSingle()

    if (existing) {
      const { error: deleteError } = await this.supabase
        .from('bookmarks')
        .delete()
        .eq('id', existing.id)

      if (deleteError) throw deleteError

      const { data: deal } = await this.supabase
        .from('deals')
        .select('bookmark_count')
        .eq('id', dealId)
        .single()

      await this.supabase
        .from('deals')
        .update({ bookmark_count: Math.max(0, (deal?.bookmark_count || 0) - 1) })
        .eq('id', dealId)

      ;(async () => { try { await this.supabase.from('user_interactions').insert({ user_id: userId, deal_id: dealId, action: InteractionAction.UNBOOKMARK }) } catch {} })()

      return { bookmarked: false }
    }

    const { error: insertError } = await this.supabase
      .from('bookmarks')
      .insert({ user_id: userId, deal_id: dealId })

    if (insertError) throw insertError

    const { data: deal } = await this.supabase
      .from('deals')
      .select('bookmark_count')
      .eq('id', dealId)
      .single()

    await this.supabase
      .from('deals')
      .update({ bookmark_count: (deal?.bookmark_count || 0) + 1 })
      .eq('id', dealId)

    ;(async () => { try { await this.supabase.from('user_interactions').insert({ user_id: userId, deal_id: dealId, action: InteractionAction.BOOKMARK }) } catch {} })()

    return { bookmarked: true }
  }

  private distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = (value: number) => value * Math.PI / 180
    const earthRadiusKm = 6371
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  private sanitizeDeal(deal: any) {
    if (!deal) return deal
    if (deal.user?.password_hash) {
      const { password_hash, ...safeUser } = deal.user
      deal.user = safeUser
    }
    if (deal.comments) {
      deal.comments = deal.comments.map((comment: any) => {
        if (comment.user?.password_hash) {
          const { password_hash, ...safeUser } = comment.user
          comment.user = safeUser
        }
        return comment
      })
    }
    return deal
  }
}
