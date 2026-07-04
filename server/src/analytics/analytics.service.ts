import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'

@Injectable()
export class AnalyticsService {
  private eventBuffer: any[] = []

  constructor(
    private supabaseService: SupabaseService,
  ) {}

  async recordEvent(event: { userId: string; dealId?: string; eventType: string; metadata?: any }) {
    const { data, error } = await this.supabaseService.client
      .from('activity_events')
      .insert({
        user_id: event.userId,
        deal_id: event.dealId || null,
        event_type: event.eventType,
        metadata: event.metadata || null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async computeLiveMetrics() {
    const oneMinuteAgo = new Date(Date.now() - 60_000)

    const { data: recentEvents, error } = await this.supabaseService.client
      .from('activity_events')
      .select('*')
      .gt('created_at', oneMinuteAgo.toISOString())
    if (error) throw error

    const events = recentEvents || []
    const uniqueUserIds = new Set(events.map(e => e.user_id).filter(Boolean))

    const metrics = {
      active_users: uniqueUserIds.size,
      reservations_per_minute: events.filter(e => e.event_type === 'reservation_made').length,
      deals_per_minute: events.filter(e => e.event_type === 'deal_created').length,
      verifications_total: events.filter(e => e.event_type === 'deal_verified').length,
      comments_total: events.filter(e => e.event_type === 'comment_added').length,
    }

    const { error: insertError } = await this.supabaseService.client
      .from('analytics_snapshots')
      .insert(metrics)
    if (insertError) throw insertError

    return {
      ...metrics,
      timestamp: new Date(),
    }
  }

  async recordSnapshot(snapshot: { activeUsers: number; reservationsPerMinute: number; dealsPerMinute: number; verificationsTotal: number; commentsTotal: number }) {
    const { data, error } = await this.supabaseService.client
      .from('analytics_snapshots')
      .insert({
        active_users: snapshot.activeUsers,
        reservations_per_minute: snapshot.reservationsPerMinute,
        deals_per_minute: snapshot.dealsPerMinute,
        verifications_total: snapshot.verificationsTotal,
        comments_total: snapshot.commentsTotal,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async getRecentSnapshot() {
    const { data, error } = await this.supabaseService.client
      .from('analytics_snapshots')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(1)
      .single()
    if (error) return null
    return data
  }

  async getActivityLog(page = 1, limit = 50) {
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error } = await this.supabaseService.client
      .from('activity_events')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to)
    if (error) throw error
    return data || []
  }

  async getHistory() {
    const { data, error } = await this.supabaseService.client
      .from('analytics_snapshots')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data || []
  }
}
