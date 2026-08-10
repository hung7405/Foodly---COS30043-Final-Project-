import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'

const TYPE_BY_EVENT: Record<string, { type: string; message: string }> = {
  deal_created: { type: 'deal', message: 'posted a new deal' },
  reservation_made: { type: 'reservation', message: 'made a reservation' },
  deal_verified: { type: 'verification', message: 'verified a deal' },
  comment_added: { type: 'default', message: 'commented on a deal' },
}

@Injectable()
export class FeedService {
  constructor(private supabaseService: SupabaseService) {}

  async getRecent(limit = 30) {
    const { data, error } = await this.supabaseService.client
      .from('activity_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 50))
    if (error) throw error

    const rows = data || []
    const userIds = [...new Set(rows.map((r: any) => r.user_id).filter(Boolean))]
    let usersByKey = new Map<string, any>()
    if (userIds.length) {
      const { data: users } = await this.supabaseService.client
        .from('users')
        .select('id, username, first_name, last_name')
        .in('id', userIds)
      usersByKey = new Map((users || []).map((u: any) => [u.id, u]))
    }

    const activities = rows
      .filter((r: any) => TYPE_BY_EVENT[r.event_type])
      .map((r: any) => {
        const meta = TYPE_BY_EVENT[r.event_type]
        const user = usersByKey.get(r.user_id)
        return {
          id: r.id,
          type: meta.type,
          message: meta.message,
          user: user ? user.username || [user.first_name, user.last_name].filter(Boolean).join(' ') : 'Community Member',
          time: r.created_at,
        }
      })
    return activities
  }
}