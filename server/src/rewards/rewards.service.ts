import { Injectable, BadRequestException, ConflictException } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { SupabaseService } from '../supabase/supabase.service'
import { SocketGateway } from '../socket/socket.gateway'
import * as crypto from 'crypto'

export const IMPACT_CO2_PER_BAG = 2.7
export const IMPACT_KG_PER_BAG = 0.3

@Injectable()
export class RewardsService {
  constructor(
    private supabase: SupabaseService,
    private socketGateway: SocketGateway,
  ) {}

  async getImpact(userId: string) {
    const { data } = await this.supabase.client
      .from('reservations')
      .select('quantity_reserved, deal:deal_id(discount_price, original_price)')
      .eq('user_id', userId)
      .eq('status', 'confirmed')
    const rows = (data || []) as any[]
    const bags = rows.reduce((s, r) => s + (r.quantity_reserved || 0), 0)
    const moneySaved = rows.reduce((s, r) => {
      const deal = Array.isArray(r.deal) ? r.deal[0] : r.deal
      return s + (Number(deal?.original_price || 0) - Number(deal?.discount_price || 0)) * (r.quantity_reserved || 0)
    }, 0)
    return {
      bags,
      foodKg: Math.round(bags * IMPACT_KG_PER_BAG * 100) / 100,
      co2Kg: Math.round(bags * IMPACT_CO2_PER_BAG * 100) / 100,
      moneySaved: Math.round(moneySaved),
    }
  }

  async getBalance(userId: string) {
    const { data: user } = await this.supabase.client
      .from('users')
      .select('reputation_points')
      .eq('id', userId)
      .single()
    return { balance: user?.reputation_points ?? 0 }
  }

  async dailySpin(userId: string, tzOffsetMinutes = 0) {
    const today = this.localDayKey(Date.now(), tzOffsetMinutes)
    const nextSpinAt = this.nextLocalMidnight(Date.now(), tzOffsetMinutes)
    const eventId = this.dailySpinEventId(userId, today)

    const prize = this.randomPrize()
    // Atomic claim: deterministic id from (user, day) + upsert on the primary key.
    // PostgREST `ignoreDuplicates` means exactly ONE concurrent request wins and
    // actually inserts the row; losers get 0 rows back and read as alreadyUsed.
    const { data: claimed, error: claimError } = await this.supabase.client
      .from('activity_events')
      .upsert(
        { id: eventId, user_id: userId, event_type: 'daily_spin', metadata: { prize, at: new Date().toISOString() } },
        { onConflict: 'id', ignoreDuplicates: true },
      )
      .select('id')
    if (claimError) throw claimError

    const days = await this.spinDaysSet(userId, tzOffsetMinutes)

    if (!claimed || claimed.length === 0) {
      const { data: user } = await this.supabase.client
        .from('users')
        .select('reputation_points')
        .eq('id', userId)
        .single()
      // Streak "at risk": consecutive days ending yesterday — today has not been spun yet.
      const streak = this.consecutiveStreak(days, tzOffsetMinutes, 1)
      return {
        alreadyUsed: true,
        prize: 0,
        balance: user?.reputation_points ?? 0,
        nextSpinAt,
        streak,
        streakBonus: 0,
      }
    }

    // Winner: today's spin extends the streak carried from yesterday by one.
    const carry = this.consecutiveStreak(days, tzOffsetMinutes, 1)
    const streak = carry + 1
    const streakBonus = this.streakBonus(streak)
    const balance = await this.awardPoints(userId, prize + streakBonus)
    return { alreadyUsed: false, prize, streak, streakBonus, balance, nextSpinAt }
  }

  async getSpinStatus(userId: string, tzOffsetMinutes = 0) {
    const today = this.localDayKey(Date.now(), tzOffsetMinutes)
    const nextSpinAt = this.nextLocalMidnight(Date.now(), tzOffsetMinutes)
    const eventId = this.dailySpinEventId(userId, today)

    const { data } = await this.supabase.client
      .from('activity_events')
      .select('id')
      .eq('id', eventId)
      .maybeSingle()
    const usedToday = !!data

    const days = await this.spinDaysSet(userId, tzOffsetMinutes)
    // usedToday -> active streak includes today; otherwise the streak that is at
    // risk plus the bonus they would unlock by spinning today.
    const streak = usedToday
      ? this.consecutiveStreak(days, tzOffsetMinutes, 1) + 1
      : this.consecutiveStreak(days, tzOffsetMinutes, 1)
    const balance = (await this.getBalance(userId)).balance
    return {
      usedToday,
      nextSpinAt: usedToday ? nextSpinAt : null,
      balance,
      streak,
      streakBonus: usedToday ? this.streakBonus(streak) : this.streakBonus(streak + 1),
    }
  }

  // All local-day keys (YYYY-MM-DD) on which the user has a daily_spin event.
  // One query, then streak length is derived locally — no per-day round trips.
  private async spinDaysSet(userId: string, tzOffsetMinutes: number): Promise<Set<string>> {
    const { data, error } = await this.supabase.client
      .from('activity_events')
      .select('created_at')
      .eq('user_id', userId)
      .eq('event_type', 'daily_spin')
    if (error) throw error
    const days = new Set<string>()
    for (const row of data || []) {
      days.add(
        new Date(new Date(row.created_at).getTime() - tzOffsetMinutes * 60000).toISOString().slice(0, 10),
      )
    }
    return days
  }

  // Number of consecutive days ending at the local day `startOffset` days ago
  // (0 = today). Stops at the first missing day.
  private consecutiveStreak(days: Set<string>, tzOffsetMinutes: number, startOffset: number): number {
    const localNowMs = Date.now() - tzOffsetMinutes * 60000
    let streak = 0
    for (let offset = startOffset; ; offset++) {
      const day = new Date(localNowMs - offset * 86400000).toISOString().slice(0, 10)
      if (!days.has(day)) break
      streak++
    }
    return streak
  }

  // Escalating bonus for consecutive daily spins, capping after day 7.
  private streakBonus(streak: number): number {
    const table = [0, 0, 10, 20, 30, 50, 75, 100]
    return table[Math.min(Math.max(Math.floor(streak), 0), table.length - 1)]
  }

  // Calendar date (YYYY-MM-DD) in the caller's local timezone.
  // tzOffsetMinutes is what Date#getTimezoneOffset() returns: UTC minus local, so
  // local = UTC - offset. Default 0 keeps UTC behaviour for callers without a tz.
  private localDayKey(ts: number, tzOffsetMinutes: number): string {
    return new Date(ts - tzOffsetMinutes * 60000).toISOString().slice(0, 10)
  }

  // Start of the *next* local calendar day as an absolute UTC instant, so the
  // client can render a countdown and flip the button on exactly midnight local.
  private nextLocalMidnight(ts: number, tzOffsetMinutes: number): string {
    const localMs = ts - tzOffsetMinutes * 60000
    const startOfNextLocalDay = (Math.floor(localMs / 86400000) + 1) * 86400000
    return new Date(startOfNextLocalDay + tzOffsetMinutes * 60000).toISOString()
  }

  async redeem(userId: string, points: number) {
    const amount = Math.max(100, Math.floor(Number(points) || 0))
    const discount = Math.round((amount / 100) * 1000)
    const code = 'FOODLY-' + crypto.randomBytes(4).toString('hex').toUpperCase()

    // Compare-and-swap on reputation_points: the update only applies when the
    // balance is unchanged since we read it, so concurrent redeems can never
    // overspend / double-spend. Retry a few times if a concurrent write wins.
    for (let attempt = 0; attempt < 5; attempt++) {
      const balance = (await this.getBalance(userId)).balance
      if (amount > balance) throw new BadRequestException('Not enough points')

      const remaining = balance - amount
      const { data: updated, error: updateError } = await this.supabase.client
        .from('users')
        .update({ reputation_points: remaining })
        .eq('id', userId)
        .eq('reputation_points', balance)
        .select('reputation_points')
        .maybeSingle()
      if (updateError) throw updateError
      if (updated) {
        await this.supabase.client.from('activity_events').insert({
          user_id: userId,
          event_type: 'reward_redeem',
          metadata: { points: amount, code, discount, at: new Date().toISOString() },
        })
        return { code, points: amount, discount, remaining }
      }
    }
    throw new ConflictException('Concurrent points update — please try again')
  }

  async awardPoints(userId: string, points: number) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: user } = await this.supabase.client
        .from('users')
        .select('reputation_points')
        .eq('id', userId)
        .single()
      const current = user?.reputation_points ?? 0
      const next = current + points
      const { data: updated, error: updateError } = await this.supabase.client
        .from('users')
        .update({ reputation_points: next })
        .eq('id', userId)
        .eq('reputation_points', current)
        .select('reputation_points')
        .maybeSingle()
      if (updateError) throw updateError
      if (updated) {
        this.socketGateway.server?.to(`user:${userId}`).emit('points:awarded', { points, balance: next })
        return next
      }
    }
    throw new ConflictException('Concurrent points update — please try again')
  }

  async escalateDiscounts() {
    const now = new Date().toISOString()
    const horizon = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
    const { data: deals } = await this.supabase.client
      .from('deals')
      .select('*')
      .eq('status', 'active')
      .gte('expires_at', now)
      .lte('expires_at', horizon)

    for (const deal of deals || []) {
      const original = Number(deal.original_price)
      const current = Number(deal.discount_price)
      if (!original || !current || current / original <= 0.3) continue
      const next = Math.max(Math.round((current * 0.85) / 1000) * 1000, Math.round(original * 0.3))
      if (next >= current) continue
      const { error } = await this.supabase.client
        .from('deals')
        .update({ discount_price: next })
        .eq('id', deal.id)
      if (!error) {
        this.socketGateway.emitDealUpdated(deal.id, { discountPrice: next, priceDrop: true })
      }
    }
  }

  private dailySpinEventId(userId: string, day: string) {
    const namespace = Buffer.from('6ba7b810-9dad-11d1-80b4-00c04fd430c8'.replace(/-/g, ''), 'hex')
    const name = Buffer.from(`daily_spin:${userId}:${day}`)
    const hash = crypto.createHash('sha1').update(namespace).update(name).digest()
    const id = Buffer.from(hash.subarray(0, 16))
    id[6] = (id[6] & 0x0f) | 0x50
    id[8] = (id[8] & 0x3f) | 0x80
    const hex = id.toString('hex')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  private randomPrize() {
    const table: Array<{ w: number; v: number }> = [
      { w: 40, v: 10 },
      { w: 30, v: 20 },
      { w: 15, v: 30 },
      { w: 10, v: 50 },
      { w: 4, v: 100 },
      { w: 1, v: 200 },
    ]
    const r = Math.random() * 100
    let acc = 0
    for (const t of table) {
      acc += t.w
      if (r <= acc) return t.v
    }
    return 10
  }

  @Cron('0 */5 * * * *')
  handleEscalateDiscounts() {
    this.escalateDiscounts().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('escalateDiscounts failed:', err)
    })
  }
}
