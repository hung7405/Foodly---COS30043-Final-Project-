import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import { assertUuid } from '../common/uuid'
import { Deal, DealStatus } from './entities/deal.entity'
import { CommentStatus } from '../comments/entities/comment.entity'
import { VerificationAction } from './entities/verification-event.entity'
import { InteractionAction } from '../interactions/entities/interaction.entity'
import { SocketGateway } from '../socket/socket.gateway'
import { AnalyticsService } from '../analytics/analytics.service'

const CATEGORY_TAGS: Record<string, string[]> = {
  food: ['com', 'ga', 'gao', 'thit', 'ca', 'mi', 'banh mi', 'bento', 'pizza', 'xuc xich', 'cha gio', 'suon', 'chan ga', 'ramen', 'dimsum', 'takoyaki', 'tokbokki', 'sandwich', 'banh trang', 'do an nhanh', 'kem', 'khoai tay', 'bo', 'bo kho', 'pasta', 'salad', 'thit nuong', 'bit tet'],
  drinks: ['uong', 'nuoc', 'ca phe', 'tra sua', 'bia', 'sua', 'tang luc', 'yen sao', 'matcha', 'tra dao', 'sua chua', 'sua da', 'nuoc ngot', 'nuoc ep', 'tra', 'vang'],
  bakery: ['banh', 'sandwich', 'baguette', 'mochi', 'taiyaki', 'flan', 'banh gao', 'banh mi', 'banh ngot'],
  grocery: ['thuc pham', 'rau', 'cu', 'gao', 'trung', 'pho mai', 'trai cay', 'dua hau', 'tom', 'hai san', 'thit', 'heo', 'dau olive', 'tuoi song', 'sua', 'hat', 'mi tom', 'sua chua', 'banh gao', 'nuoc'],
  asian: ['hang han', 'hang nhat', 'nhat', 'hoa', 'viet', 'kim chi', 'kim bap', 'tokbokki', 'ramen', 'dimsum', 'ha cao', 'mochi', 'taiyaki', 'takoyaki', 'banh trang', 'cha gio', 'pho', 'gochujang', 'han'],
  western: ['tay', 'y', 'phap', 'duc', 'my', 'pizza', 'pasta', 'bit tet', 'steak', 'ruou', 'vang', 'pho mai', 'cheese', 'bo', 'thit bo', 'nhap khau'],
  dessert: ['trang mieng', 'kem', 'banh ngot', 'snack ngot', 'flan', 'che', 'mochi', 'taiyaki', 'cheesecake', 'socola', 'caramel'],
  healthy: ['healthy', 'suc khoe', 'salad', 'rau', 'khong duong', 'nguyen cam', 'tuoi song', 'trai cay', 'nuoc ep'],
}

function dealMatchesCategory(deal: any, category: string): boolean {
  const keywords = CATEGORY_TAGS[category.toLowerCase()] || [category.toLowerCase()]
  return (deal.tags || []).some((tag: string) => {
    const normalized = String(tag).toLowerCase().replace(/_/g, ' ')
    const tokens = normalized.split(/\s+/).filter(Boolean)
    return keywords.some(kw => (kw.includes(' ') ? normalized.includes(kw) : tokens.includes(kw)))
  })
}

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
    store?: string; minRating?: number; minDiscount?: number;
  }) {
    const page = Math.max(Number(query.page) || 1, 1)
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100)
    const sort = ['created_at', 'expires_at', 'discount_price', 'remaining_quantity', 'like_count', 'discount', 'price-asc', 'price-desc'].includes(String(query.sort)) ? String(query.sort) : 'created_at'
    const order = String(query.order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    const dbSort = ['created_at', 'expires_at', 'discount_price', 'remaining_quantity', 'like_count'].includes(sort) ? sort : null

    let supabaseQuery = this.supabase
      .from('deals')
      .select('*, user:user_id(id,email,username,first_name,last_name,role,avatar_url,trust_score,reputation_points,is_active,created_at,updated_at,last_login), store:stores(*)')

    if (query.status) supabaseQuery = supabaseQuery.eq('status', query.status)
    else supabaseQuery = supabaseQuery.neq('status', DealStatus.REMOVED).neq('status', DealStatus.EXPIRED)
    if (query.verified !== undefined) supabaseQuery = supabaseQuery.eq('verified', query.verified === 'true')
    if (query.userId) supabaseQuery = supabaseQuery.eq('user_id', query.userId)

    if (dbSort) supabaseQuery = supabaseQuery.order(dbSort, { ascending: order === 'ASC' })

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
      filtered = filtered.filter(deal => dealMatchesCategory(deal, String(query.category)))
    }

    if (query.store) {
      const s = String(query.store).toLowerCase()
      filtered = filtered.filter(deal => deal.store?.name?.toLowerCase().includes(s))
    }

    if (query.minRating) {
      const min = Number(query.minRating)
      filtered = filtered.filter(deal => Math.round((Number(deal.store?.avg_trust_score) || 0) / 20) >= min)
    }

    if (query.minDiscount) {
      const min = Number(query.minDiscount)
      filtered = filtered.filter(deal => {
        const orig = Number(deal.original_price)
        const disc = Number(deal.discount_price)
        const pct = orig && disc ? Math.round((1 - disc / orig) * 100) : 0
        return pct >= min
      })
    }

    const lat = Number(query.lat)
    const lng = Number(query.lng)
    const radius = Number(query.radius || 5)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      filtered = filtered
        .map(deal => ({ ...deal, distanceKm: this.distanceKm(lat, lng, Number(deal.latitude), Number(deal.longitude)) }))
      filtered = filtered.filter((deal: any) => deal.distanceKm <= radius)
    }

    if (sort === 'discount') {
      filtered = filtered.sort((a: any, b: any) => {
        const pctA = a.original_price && a.discount_price ? (1 - a.discount_price / a.original_price) : 0
        const pctB = b.original_price && b.discount_price ? (1 - b.discount_price / b.original_price) : 0
        return pctB - pctA
      })
    } else if (sort === 'price-asc') {
      filtered = filtered.sort((a: any, b: any) => (Number(a.discount_price) || 0) - (Number(b.discount_price) || 0))
    } else if (sort === 'price-desc') {
      filtered = filtered.sort((a: any, b: any) => (Number(b.discount_price) || 0) - (Number(a.discount_price) || 0))
    } else if (Number.isFinite(lat) && Number.isFinite(lng)) {
      filtered = filtered.sort((a: any, b: any) => a.distanceKm - b.distanceKm)
    }

    const total = filtered.length
    const paged = filtered.slice((page - 1) * limit, page * limit).map(deal => this.sanitizeDeal(deal))
    return { deals: paged, total, page, totalPages: Math.ceil(total / limit) }
  }

  async findMapDeals(swLat: number, swLng: number, neLat: number, neLng: number, status?: string) {
    let query = this.supabase
      .from('deals')
      .select('*, user:user_id(id,email,username,first_name,last_name,role,avatar_url,trust_score,reputation_points,is_active,created_at,updated_at,last_login), store:stores(*)')
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
    assertUuid(id, 'Deal not found')

    const { data: deal, error } = await this.supabase
      .from('deals')
      .select('*, user:user_id(id,email,username,first_name,last_name,role,avatar_url,trust_score,reputation_points,is_active,created_at,updated_at,last_login), store:stores(*), comments:comments(*, user:user_id(id,email,username,first_name,last_name,role,avatar_url,trust_score,reputation_points,is_active,created_at,updated_at,last_login))')
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
      user_id: userId,
      title: data.title.trim(),
      description: data.description ?? null,
      original_price: Number(data.originalPrice),
      discount_price: Number(data.discountPrice),
      remaining_quantity: remainingQuantity,
      original_quantity: remainingQuantity,
      expires_at: data.expiresAt ? new Date(data.expiresAt).toISOString() : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      address: data.address ?? null,
      images: Array.isArray(data.images) ? data.images : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
    }

    const { data: saved, error } = await this.supabase
      .from('deals')
      .insert(payload)
      .select('*, user:user_id(id,email,username,first_name,last_name,role,avatar_url,trust_score,reputation_points,is_active,created_at,updated_at,last_login), store:stores(*)')
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

    const allowedFields: Record<string, string> = {
      title: 'title',
      description: 'description',
      originalPrice: 'original_price',
      discountPrice: 'discount_price',
      remainingQuantity: 'remaining_quantity',
      images: 'images',
      tags: 'tags',
      address: 'address',
      latitude: 'latitude',
      longitude: 'longitude',
      expiresAt: 'expires_at',
    }
    const updates: any = {}
    for (const [camel, snake] of Object.entries(allowedFields)) {
      if ((data as any)[camel] !== undefined) {
        const value = (data as any)[camel]
        updates[snake] =
          camel === 'expiresAt' ? new Date(value).toISOString() :
          camel === 'remainingQuantity' ? Math.max(Number(value) || 0, 0) :
          (typeof value === 'number' || !Number.isNaN(Number(value))) && ['originalPrice', 'discountPrice', 'latitude', 'longitude'].includes(camel) ? Number(value) :
          value
      }
    }

    const { data: saved, error: updateError } = await this.supabase
      .from('deals')
      .update(updates)
      .eq('id', id)
      .select('*, user:user_id(id,email,username,first_name,last_name,role,avatar_url,trust_score,reputation_points,is_active,created_at,updated_at,last_login), store:stores(*)')
      .single()

    if (updateError) throw updateError

    this.socketGateway.emitDealUpdated(id, updates)
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
      .select('*, user:user_id(id,email,username,first_name,last_name,role,avatar_url,trust_score,reputation_points,is_active,created_at,updated_at,last_login), store:stores(*)')
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
      .select('*, user:user_id(id,email,username,first_name,last_name,role,avatar_url,trust_score,reputation_points,is_active,created_at,updated_at,last_login), store:stores(*)')
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

      await this.decrementCounter('deals', dealId, 'like_count')

      ;(async () => { try { await this.supabase.from('user_interactions').insert({ user_id: userId, deal_id: dealId, action: InteractionAction.UNLIKE }) } catch {} })()

      return { liked: false }
    }

    const { error: insertError } = await this.supabase
      .from('likes')
      .insert({ user_id: userId, target_id: dealId, target_type: 'deal' })

    if (insertError) throw insertError

    await this.incrementCounter('deals', dealId, 'like_count')

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

      await this.decrementCounter('deals', dealId, 'bookmark_count')

      ;(async () => { try { await this.supabase.from('user_interactions').insert({ user_id: userId, deal_id: dealId, action: InteractionAction.UNBOOKMARK }) } catch {} })()

      return { bookmarked: false }
    }

    const { error: insertError } = await this.supabase
      .from('bookmarks')
      .insert({ user_id: userId, deal_id: dealId })

    if (insertError) throw insertError

    await this.incrementCounter('deals', dealId, 'bookmark_count')

    ;(async () => { try { await this.supabase.from('user_interactions').insert({ user_id: userId, deal_id: dealId, action: InteractionAction.BOOKMARK }) } catch {} })()

    return { bookmarked: true }
  }

  /**
   * Atomic increment via compare-and-swap on the counter column: the update
   * only applies when the stored value still matches what we read, so two
   * concurrent likes can never lose an increment. Retries a few times when
   * a concurrent write wins the race.
   */
  private async incrementCounter(table: string, id: string, column: string) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const { data: row } = await this.supabase
        .from(table)
        .select(column)
        .eq('id', id)
        .single()
      const current = Number(row?.[column] || 0)
      const { data: updated } = await this.supabase
        .from(table)
        .update({ [column]: current + 1 })
        .eq('id', id)
        .eq(column, current)
        .select(column)
        .maybeSingle()
      if (updated) return
      await new Promise((r) => setTimeout(r, 5))
    }
    throw new ConflictException('Concurrent update — please try again')
  }

  private async decrementCounter(table: string, id: string, column: string) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const { data: row } = await this.supabase
        .from(table)
        .select(column)
        .eq('id', id)
        .single()
      const current = Number(row?.[column] || 0)
      const { data: updated } = await this.supabase
        .from(table)
        .update({ [column]: Math.max(0, current - 1) })
        .eq('id', id)
        .eq(column, current)
        .select(column)
        .maybeSingle()
      if (updated) return
      await new Promise((r) => setTimeout(r, 5))
    }
    throw new ConflictException('Concurrent update — please try again')
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
