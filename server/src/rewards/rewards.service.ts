import { Injectable, BadRequestException } from '@nestjs/common'
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

  async dailySpin(userId: string) {
    const today = new Date().toISOString().slice(0, 10)
    const { data: existing } = await this.supabase.client
      .from('activity_events')
      .select('id')
      .eq('user_id', userId)
      .eq('event_type', 'daily_spin')
      .gte('created_at', today)
      .maybeSingle()
    if (existing) {
      const { data: user } = await this.supabase.client
        .from('users')
        .select('reputation_points')
        .eq('id', userId)
        .single()
      return { alreadyUsed: true, prize: 0, balance: user?.reputation_points ?? 0 }
    }

    const prize = this.randomPrize()
    const balance = await this.awardPoints(userId, prize)
    await this.supabase.client.from('activity_events').insert({
      user_id: userId,
      event_type: 'daily_spin',
      metadata: { prize, at: new Date().toISOString() },
    })
    return { alreadyUsed: false, prize, balance }
  }

  async redeem(userId: string, points: number) {
    const amount = Math.max(100, Math.floor(Number(points) || 0))
    const balance = (await this.getBalance(userId)).balance
    if (amount > balance) throw new BadRequestException('Not enough points')

    const discount = Math.round((amount / 100) * 1000)
    const code = 'FOODLY-' + crypto.randomBytes(4).toString('hex').toUpperCase()
    const remaining = balance - amount
    await this.supabase.client.from('users').update({ reputation_points: remaining }).eq('id', userId)
    await this.supabase.client.from('activity_events').insert({
      user_id: userId,
      event_type: 'reward_redeem',
      metadata: { points: amount, code, discount, at: new Date().toISOString() },
    })
    return { code, points: amount, discount, remaining }
  }

  async awardPoints(userId: string, points: number) {
    const { data: user } = await this.supabase.client
      .from('users')
      .select('reputation_points')
      .eq('id', userId)
      .single()
    const next = (user?.reputation_points ?? 0) + points
    await this.supabase.client.from('users').update({ reputation_points: next }).eq('id', userId)
    this.socketGateway.server?.to(`user:${userId}`).emit('points:awarded', { points, balance: next })
    return next
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
