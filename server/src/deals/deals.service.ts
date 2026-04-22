import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between } from 'typeorm'
import { Deal, DealStatus } from './entities/deal.entity'
import { Like as LikeEntity } from './entities/like.entity'
import { Bookmark } from './entities/bookmark.entity'
import { VerificationEvent, VerificationAction } from './entities/verification-event.entity'
import { SocketGateway } from '../socket/socket.gateway'
import { AnalyticsService } from '../analytics/analytics.service'

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(Deal)
    private dealRepository: Repository<Deal>,
    @InjectRepository(LikeEntity)
    private likeRepository: Repository<LikeEntity>,
    @InjectRepository(Bookmark)
    private bookmarkRepository: Repository<Bookmark>,
    @InjectRepository(VerificationEvent)
    private verificationRepository: Repository<VerificationEvent>,
    private socketGateway: SocketGateway,
    private analyticsService: AnalyticsService,
  ) {}

  async findAll(query: {
    page?: number; limit?: number; search?: string; category?: string;
    sort?: string; order?: 'ASC' | 'DESC'; status?: string; verified?: string;
    lat?: number; lng?: number; radius?: number; userId?: string;
  }) {
    const page = Math.max(Number(query.page) || 1, 1)
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100)
    const sort = ['createdAt', 'expiresAt', 'discountPrice', 'remainingQuantity', 'likeCount'].includes(String(query.sort)) ? String(query.sort) : 'createdAt'
    const order = String(query.order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    const where: any = {}
    if (query.status) where.status = query.status
    if (query.verified !== undefined) where.verified = query.verified === 'true'
    if (query.userId) where.userId = query.userId

    let deals = await this.dealRepository.find({
      where,
      order: { [sort]: order },
      relations: { user: true, store: true },
    })

    if (query.search) {
      const s = String(query.search).toLowerCase()
      deals = deals.filter(deal =>
        deal.title.toLowerCase().includes(s) ||
        deal.description?.toLowerCase().includes(s) ||
        deal.store?.name?.toLowerCase().includes(s) ||
        deal.tags?.some(tag => tag.toLowerCase().includes(s)),
      )
    }

    if (query.category && query.category !== 'All') {
      const c = String(query.category).toLowerCase()
      deals = deals.filter(deal => deal.tags?.some(tag => tag.toLowerCase().includes(c)))
    }

    const lat = Number(query.lat)
    const lng = Number(query.lng)
    const radius = Number(query.radius || 5)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      deals = deals
        .map(deal => ({ ...deal, distanceKm: this.distanceKm(lat, lng, Number(deal.latitude), Number(deal.longitude)) })) as any[]
      deals = deals.filter((deal: any) => deal.distanceKm <= radius)
      deals.sort((a: any, b: any) => a.distanceKm - b.distanceKm)
    }

    const total = deals.length
    const paged = deals.slice((page - 1) * limit, page * limit).map(deal => this.sanitizeDeal(deal))
    return { deals: paged, total, page, totalPages: Math.ceil(total / limit) }
  }

  async findMapDeals(swLat: number, swLng: number, neLat: number, neLng: number, status?: string) {
    const where: any = { status: status || DealStatus.ACTIVE }
    if ([swLat, swLng, neLat, neLng].every(Number.isFinite)) {
      where.latitude = Between(Math.min(swLat, neLat), Math.max(swLat, neLat))
      where.longitude = Between(Math.min(swLng, neLng), Math.max(swLng, neLng))
    }

    const deals = await this.dealRepository.find({
      where,
      relations: { user: true, store: true },
      order: { createdAt: 'DESC' },
    })
    return deals.map(deal => this.sanitizeDeal(deal))
  }

  async findById(id: string) {
    const deal = await this.dealRepository.findOne({ where: { id }, relations: { user: true, store: true, comments: { user: true } } })
    if (!deal) throw new NotFoundException('Deal not found')
    return this.sanitizeDeal(deal)
  }

  async findMine(userId: string) {
    return this.findAll({ userId, page: 1, limit: 100, sort: 'createdAt', order: 'DESC' })
  }

  async create(data: Partial<Deal>, userId: string) {
    if (!data.title?.trim()) throw new BadRequestException('Title is required')
    if (!Number.isFinite(Number(data.discountPrice)) || Number(data.discountPrice) <= 0) throw new BadRequestException('Discount price must be greater than 0')
    if (!Number.isFinite(Number(data.originalPrice)) || Number(data.originalPrice) < Number(data.discountPrice)) throw new BadRequestException('Original price must be greater than discount price')
    if (!Number.isFinite(Number(data.latitude)) || !Number.isFinite(Number(data.longitude))) throw new BadRequestException('A valid location is required')

    const remainingQuantity = Math.max(Number(data.remainingQuantity) || 1, 1)
    const deal = this.dealRepository.create({
      ...data,
      userId,
      title: data.title.trim(),
      originalPrice: Number(data.originalPrice),
      discountPrice: Number(data.discountPrice),
      remainingQuantity,
      originalQuantity: remainingQuantity,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 2 * 60 * 60 * 1000),
      images: Array.isArray(data.images) ? data.images : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
    })
    const saved = await this.dealRepository.save(deal)
    this.socketGateway.emitDealCreated(this.sanitizeDeal(saved))
    this.analyticsService.recordEvent({ userId, eventType: 'deal_created', dealId: saved.id }).catch(() => {})
    return this.sanitizeDeal(saved)
  }

  async update(id: string, data: Partial<Deal>, userId: string, userRole: string) {
    const deal = await this.dealRepository.findOne({ where: { id } })
    if (!deal) throw new NotFoundException('Deal not found')
    if (deal.userId !== userId && userRole !== 'admin' && userRole !== 'moderator') {
      throw new ForbiddenException('You can only edit your own deals')
    }
    Object.assign(deal, data)
    const saved = await this.dealRepository.save(deal)
    this.socketGateway.emitDealUpdated(id, data)
    return this.sanitizeDeal(saved)
  }

  async remove(id: string, userId: string, userRole: string) {
    const deal = await this.dealRepository.findOne({ where: { id } })
    if (!deal) throw new NotFoundException('Deal not found')
    if (deal.userId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only delete your own deals')
    }
    deal.status = DealStatus.REMOVED
    return this.sanitizeDeal(await this.dealRepository.save(deal))
  }

  async verify(id: string, moderatorId: string, action: VerificationAction, notes?: string) {
    const deal = await this.dealRepository.findOne({ where: { id } })
    if (!deal) throw new NotFoundException('Deal not found')
    deal.verified = action === VerificationAction.VERIFIED
    deal.verifiedById = moderatorId
    await this.dealRepository.save(deal)

    const event = this.verificationRepository.create({ dealId: id, moderatorId, action, notes })
    await this.verificationRepository.save(event)

    this.socketGateway.emitDealVerified(id, moderatorId)
    return this.sanitizeDeal(deal)
  }

  async toggleLike(dealId: string, userId: string) {
    const existing = await this.likeRepository.findOne({ where: { userId, targetId: dealId, targetType: 'deal' } })
    if (existing) {
      await this.likeRepository.remove(existing)
      await this.dealRepository.decrement({ id: dealId }, 'likeCount', 1)
      return { liked: false }
    }
    await this.likeRepository.save({ userId, targetId: dealId, targetType: 'deal' })
    await this.dealRepository.increment({ id: dealId }, 'likeCount', 1)
    return { liked: true }
  }

  async toggleBookmark(dealId: string, userId: string) {
    const existing = await this.bookmarkRepository.findOne({ where: { userId, dealId } })
    if (existing) {
      await this.bookmarkRepository.remove(existing)
      await this.dealRepository.decrement({ id: dealId }, 'bookmarkCount', 1)
      return { bookmarked: false }
    }
    await this.bookmarkRepository.save({ userId, dealId })
    await this.dealRepository.increment({ id: dealId }, 'bookmarkCount', 1)
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
    if (deal.user?.passwordHash) {
      const { passwordHash, ...safeUser } = deal.user
      deal.user = safeUser
    }
    if (deal.comments) {
      deal.comments = deal.comments.map((comment: any) => {
        if (comment.user?.passwordHash) {
          const { passwordHash, ...safeUser } = comment.user
          comment.user = safeUser
        }
        return comment
      })
    }
    return deal
  }
}
