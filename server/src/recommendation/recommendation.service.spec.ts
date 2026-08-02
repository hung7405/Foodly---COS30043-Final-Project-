import { RecommendationService } from './recommendation.service'

describe('RecommendationService scoring', () => {
  const service = new RecommendationService({} as any, {} as any)

  describe('calcFreshnessScore', () => {
    const now = new Date('2026-01-01T12:00:00Z').getTime()

    it('returns 0 for expired deals', () => {
      const expires = new Date(now - 60_000)
      expect((service as any).calcFreshnessScore(expires, now)).toBe(0)
    })

    it('returns 100 for deals expiring within 2 hours', () => {
      const expires = new Date(now + 60 * 60 * 1000)
      expect((service as any).calcFreshnessScore(expires, now)).toBe(100)
    })

    it('returns 80 within 6 hours', () => {
      const expires = new Date(now + 4 * 60 * 60 * 1000)
      expect((service as any).calcFreshnessScore(expires, now)).toBe(80)
    })

    it('returns 60 within 12 hours', () => {
      const expires = new Date(now + 8 * 60 * 60 * 1000)
      expect((service as any).calcFreshnessScore(expires, now)).toBe(60)
    })

    it('returns 40 within 24 hours', () => {
      const expires = new Date(now + 20 * 60 * 60 * 1000)
      expect((service as any).calcFreshnessScore(expires, now)).toBe(40)
    })

    it('returns 20 beyond 24 hours', () => {
      const expires = new Date(now + 30 * 60 * 60 * 1000)
      expect((service as any).calcFreshnessScore(expires, now)).toBe(20)
    })

    it('returns 0 when no expiry is set', () => {
      expect((service as any).calcFreshnessScore(undefined, now)).toBe(0)
    })
  })

  describe('calcPopularityScore', () => {
    it('caps like contribution at 40', () => {
      const deal = { like_count: 1_000_000, verified: false, remaining_quantity: 5 }
      expect((service as any).calcPopularityScore(deal)).toBeLessThanOrEqual(100)
    })

    it('awards 30 points for verified deals', () => {
      const verified = (service as any).calcPopularityScore({ like_count: 0, verified: true, remaining_quantity: 0 })
      const unverified = (service as any).calcPopularityScore({ like_count: 0, verified: false, remaining_quantity: 0 })
      expect(verified - unverified).toBe(30)
    })

    it('returns 0 for a brand-new unknown deal', () => {
      expect((service as any).calcPopularityScore({ like_count: 0, verified: false, remaining_quantity: 0 })).toBe(0)
    })
  })

  describe('calcHistoryScore', () => {
    it('returns 50 when the user has no tag history', () => {
      expect((service as any).calcHistoryScore(['pizza'], new Map(), 1)).toBe(50)
    })

    it('returns 100 when all deal tags fully match', () => {
      const profile = new Map([['pizza', 5]])
      expect((service as any).calcHistoryScore(['pizza'], profile, 5)).toBe(100)
    })

    it('clamps to 100', () => {
      const profile = new Map([['pizza', 10], ['pasta', 10]])
      expect((service as any).calcHistoryScore(['pizza', 'pasta'], profile, 5)).toBe(100)
    })
  })

  describe('distanceKm', () => {
    it('returns Infinity for missing coordinates', () => {
      expect((service as any).distanceKm(undefined, 1, 2, 3)).toBe(Infinity)
    })

    it('returns ~0 for identical coordinates', () => {
      expect((service as any).distanceKm(10.8, 106.6, 10.8, 106.6)).toBeLessThan(0.001)
    })

    it('returns a positive finite distance for distant points', () => {
      const d = (service as any).distanceKm(10.8, 106.6, 21.0, 105.8)
      expect(d).toBeGreaterThan(1000)
      expect(Number.isFinite(d)).toBe(true)
    })
  })
})
