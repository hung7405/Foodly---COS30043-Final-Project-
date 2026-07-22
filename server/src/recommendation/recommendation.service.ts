import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import { Deal, DealStatus } from '../deals/entities/deal.entity'
import { InteractionAction } from '../interactions/entities/interaction.entity'

const DISTANCE_WEIGHT = 0.40
const HISTORY_WEIGHT = 0.30
const POPULARITY_WEIGHT = 0.15
const INTERACTION_WEIGHT = 0.15

@Injectable()
export class RecommendationService {
  constructor(
    private supabaseService: SupabaseService,
  ) {}

  private get supabase() {
    return this.supabaseService.client
  }

  async getRecommendations(options: {
    userId?: string
    lat?: number
    lng?: number
    limit?: number
  }) {
    const limit = Math.min(Math.max(options.limit || 20, 1), 50)

    const { data: deals, error } = await this.supabase
      .from('deals')
      .select('*, user:user_id(id,email,username,first_name,last_name,role,avatar_url,trust_score,reputation_points,is_active,created_at,updated_at,last_login), store:stores(*)')
      .eq('status', DealStatus.ACTIVE)

    if (error) throw error
    if (!deals || deals.length === 0) return { recommendations: [], total: 0 }

    const userTagProfile = await this.buildUserTagProfile(options.userId)

    return this.scoreAndRank(deals, userTagProfile, options.lat, options.lng, limit)
  }

  private async buildUserTagProfile(userId?: string): Promise<Map<string, number>> {
    const tagScores = new Map<string, number>()

    if (!userId) return tagScores

    const { data: reservations } = await this.supabase
      .from('reservations')
      .select('*, deal:deals(*)')
      .eq('user_id', userId)

    if (reservations) {
      for (const r of reservations) {
        if (r.deal?.tags) {
          for (const tag of r.deal.tags) {
            tagScores.set(tag, (tagScores.get(tag) || 0) + 3)
          }
        }
      }
    }

    const { data: likes } = await this.supabase
      .from('likes')
      .select('target_id')
      .eq('user_id', userId)
      .eq('target_type', 'deal')

    const likeDealIds = (likes || []).map(l => l.target_id)
    if (likeDealIds.length > 0) {
      const { data: likedDeals } = await this.supabase
        .from('deals')
        .select('tags')
        .in('id', likeDealIds)

      if (likedDeals) {
        for (const d of likedDeals) {
          if (d.tags) for (const tag of d.tags) tagScores.set(tag, (tagScores.get(tag) || 0) + 2)
        }
      }
    }

    const { data: bookmarks } = await this.supabase
      .from('bookmarks')
      .select('deal_id')
      .eq('user_id', userId)

    const bookmarkDealIds = (bookmarks || []).map(b => b.deal_id)
    if (bookmarkDealIds.length > 0) {
      const { data: bookmarkedDeals } = await this.supabase
        .from('deals')
        .select('tags')
        .in('id', bookmarkDealIds)

      if (bookmarkedDeals) {
        for (const d of bookmarkedDeals) {
          if (d.tags) for (const tag of d.tags) tagScores.set(tag, (tagScores.get(tag) || 0) + 1)
        }
      }
    }

    const { data: viewInteractions } = await this.supabase
      .from('user_interactions')
      .select('deal_id')
      .eq('user_id', userId)
      .eq('action', InteractionAction.VIEW)
      .order('created_at', { ascending: false })
      .limit(100)

    const viewedDealIds = [...new Set((viewInteractions || []).map(v => v.deal_id))]
    if (viewedDealIds.length > 0) {
      const { data: viewedDeals } = await this.supabase
        .from('deals')
        .select('tags')
        .in('id', viewedDealIds)

      if (viewedDeals) {
        for (const d of viewedDeals) {
          if (d.tags) for (const tag of d.tags) tagScores.set(tag, (tagScores.get(tag) || 0) + 0.5)
        }
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
    const maxViewCount = Math.max(1, ...deals.map((d: any) => d.like_count + d.bookmark_count + (d.comment_count || 0)))

    const scored = deals.map(deal => {
      const distance = this.distanceKm(lat, lng, Number(deal.latitude), Number(deal.longitude))
      const distanceScore = this.calcDistanceScore(distance, Number.isFinite(lat) && Number.isFinite(lng))
      const historyScore = this.calcHistoryScore(deal.tags || [], userTagProfile, maxTagScore)
      const popularityScore = this.calcPopularityScore(deal)
      const freshnessScore = this.calcFreshnessScore((deal as any).expires_at, now)
      const interactionScore = this.calcInteractionScore(deal, maxViewCount)

      const totalScore =
        distanceScore * DISTANCE_WEIGHT +
        historyScore * HISTORY_WEIGHT +
        popularityScore * POPULARITY_WEIGHT +
        freshnessScore * 0.10 +
        interactionScore * INTERACTION_WEIGHT

      return {
        ...deal,
        distanceKm: Number.isFinite(distance) ? Math.round(distance * 100) / 100 : undefined,
        relevanceScore: Math.round(totalScore * 100) / 100,
        _scores: {
          distance: Math.round(distanceScore * 100) / 100,
          history: Math.round(historyScore * 100) / 100,
          popularity: Math.round(popularityScore * 100) / 100,
          freshness: Math.round(freshnessScore * 100) / 100,
          interaction: Math.round(interactionScore * 100) / 100,
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

  private calcPopularityScore(deal: any): number {
    const likeScore = Math.min(40, (deal.like_count || 0) / 50 * 40)
    const verifiedScore = deal.verified ? 30 : 0
    const remainingScore = Math.min(30, ((deal.remaining_quantity || 0) / 20) * 30)
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

  private calcInteractionScore(deal: any, maxViewCount: number): number {
    const viewScore = Math.min(50, ((deal.like_count + deal.bookmark_count) / Math.max(1, maxViewCount)) * 50)
    const commentScore = Math.min(30, ((deal.comment_count || 0) / 15) * 30)
    const remainingScore = Math.min(20, (deal.remaining_quantity / Math.max(1, deal.original_quantity)) * 20)
    return Math.round(viewScore + commentScore + remainingScore)
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
