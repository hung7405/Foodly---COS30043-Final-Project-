import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Deal, DealStatus } from '../deals/entities/deal.entity'
import { Reservation } from '../reservations/entities/reservation.entity'
import { Like as LikeEntity } from '../deals/entities/like.entity'
import { Bookmark } from '../deals/entities/bookmark.entity'

const DISTANCE_WEIGHT = 0.50
const HISTORY_WEIGHT = 0.30
const POPULARITY_WEIGHT = 0.20

@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(Deal)
    private dealRepository: Repository<Deal>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(LikeEntity)
    private likeRepository: Repository<LikeEntity>,
    @InjectRepository(Bookmark)
    private bookmarkRepository: Repository<Bookmark>,
  ) {}

  async getRecommendations(options: {
    userId?: string
    lat?: number
    lng?: number
    limit?: number
  }) {
    const limit = Math.min(Math.max(options.limit || 20, 1), 50)

    const deals = await this.dealRepository.find({
      where: { status: DealStatus.ACTIVE },
      relations: { user: true, store: true },
    })

    if (deals.length === 0) return { recommendations: [], total: 0 }

    const userTagProfile = await this.buildUserTagProfile(options.userId)

    return this.scoreAndRank(deals, userTagProfile, options.lat, options.lng, limit)
  }

  private async buildUserTagProfile(userId?: string): Promise<Map<string, number>> {
    const tagScores = new Map<string, number>()

    if (!userId) return tagScores

    const reservations = await this.reservationRepository.find({
      where: { userId },
      relations: { deal: true },
    })

    for (const r of reservations) {
      if (r.deal?.tags) {
        for (const tag of r.deal.tags) {
          tagScores.set(tag, (tagScores.get(tag) || 0) + 3)
        }
      }
    }

    const likeDealIds = (await this.likeRepository.find({
      where: { userId, targetType: 'deal' },
      select: { targetId: true },
    })).map(l => l.targetId)

    if (likeDealIds.length > 0) {
      const likedDeals = await this.dealRepository.find({ where: { id: In(likeDealIds) } })
      for (const d of likedDeals) {
        if (d.tags) for (const tag of d.tags) tagScores.set(tag, (tagScores.get(tag) || 0) + 2)
      }
    }

    const bookmarkDealIds = (await this.bookmarkRepository.find({
      where: { userId },
      select: { dealId: true },
    })).map(b => b.dealId)

    if (bookmarkDealIds.length > 0) {
      const bookmarkedDeals = await this.dealRepository.find({ where: { id: In(bookmarkDealIds) } })
      for (const d of bookmarkedDeals) {
        if (d.tags) for (const tag of d.tags) tagScores.set(tag, (tagScores.get(tag) || 0) + 1)
      }
    }

    return tagScores
  }

  private scoreAndRank(
    deals: Deal[],
    userTagProfile: Map<string, number>,
    lat?: number,
    lng?: number,
    limit = 20,
  ) {
    const maxTagScore = Math.max(1, ...userTagProfile.values())
    const now = Date.now()

    const scored = deals.map(deal => {
      const distance = this.distanceKm(lat, lng, Number(deal.latitude), Number(deal.longitude))
      const distanceScore = this.calcDistanceScore(distance, Number.isFinite(lat) && Number.isFinite(lng))
      const historyScore = this.calcHistoryScore(deal.tags || [], userTagProfile, maxTagScore)
      const popularityScore = this.calcPopularityScore(deal)
      const freshnessScore = this.calcFreshnessScore(deal.expiresAt, now)

      const totalScore =
        distanceScore * DISTANCE_WEIGHT +
        historyScore * HISTORY_WEIGHT +
        popularityScore * POPULARITY_WEIGHT +
        freshnessScore * 0.10

      return {
        ...deal,
        distanceKm: Number.isFinite(distance) ? Math.round(distance * 100) / 100 : undefined,
        relevanceScore: Math.round(totalScore * 100) / 100,
        _scores: {
          distance: Math.round(distanceScore * 100) / 100,
          history: Math.round(historyScore * 100) / 100,
          popularity: Math.round(popularityScore * 100) / 100,
          freshness: Math.round(freshnessScore * 100) / 100,
        },
      }
    })

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore)

    return {
      recommendations: scored.slice(0, limit).map(({ _scores, ...rest }) => rest),
      total: scored.length,
      userTagProfile: [...userTagProfile.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, score]) => ({ tag, score })),
    }
  }

  private calcDistanceScore(distance: number, hasLocation: boolean): number {
    if (!hasLocation) return 50
    if (distance <= 0.5) return 100
    if (distance <= 1) return 90
    if (distance <= 2) return 75
    if (distance <= 3) return 60
    if (distance <= 5) return 40
    if (distance <= 8) return 20
    if (distance <= 10) return 10
    return 0
  }

  private calcHistoryScore(
    dealTags: string[],
    userTagProfile: Map<string, number>,
    maxTagScore: number,
  ): number {
    if (userTagProfile.size === 0 || dealTags.length === 0) return 50
    let score = 0
    for (const tag of dealTags) {
      const match = userTagProfile.get(tag) || 0
      score += match / maxTagScore
    }
    return Math.min(100, (score / dealTags.length) * 100)
  }

  private calcPopularityScore(deal: Deal): number {
    const likeScore = Math.min(40, (deal.likeCount || 0) / 50 * 40)
    const verifiedScore = deal.verified ? 30 : 0
    const remainingScore = Math.min(30, ((deal.remainingQuantity || 0) / 20) * 30)
    return Math.round(likeScore + verifiedScore + remainingScore)
  }

  private calcFreshnessScore(expiresAt: Date | undefined, now: number): number {
    if (!expiresAt) return 0
    const msLeft = new Date(expiresAt).getTime() - now
    const hoursLeft = msLeft / (1000 * 60 * 60)
    if (hoursLeft <= 0) return 0
    if (hoursLeft <= 2) return 100
    if (hoursLeft <= 6) return 80
    if (hoursLeft <= 12) return 60
    if (hoursLeft <= 24) return 40
    return 20
  }

  private distanceKm(lat1?: number, lng1?: number, lat2?: number, lng2?: number): number {
    if (!Number.isFinite(lat1) || !Number.isFinite(lng1) || !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
      return Infinity
    }
    const toRad = (v: number) => (v * Math.PI) / 180
    const R = 6371
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
}
