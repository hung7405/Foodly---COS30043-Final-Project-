import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import { assertUuid } from '../common/uuid'
import { InteractionAction } from './entities/interaction.entity'

@Injectable()
export class InteractionsService {
  constructor(private supabase: SupabaseService) {}

  async record(params: {
    userId?: string
    dealId: string
    action: InteractionAction
    weight?: number
  }) {
    assertUuid(params.dealId, 'Deal not found')
    const { data, error } = await this.supabase.client
      .from('user_interactions')
      .insert({
        user_id: params.userId || null,
        deal_id: params.dealId,
        action: params.action,
        weight: params.weight ?? 1,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async getUserInteractions(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const { data } = await this.supabase.client
      .from('user_interactions')
      .select('*')
      .eq('user_id', userId)
      .gt('created_at', since.toISOString())
      .order('created_at', { ascending: false })
    return data ?? []
  }

  async getDealInteractions(dealId: string, days = 30) {
    assertUuid(dealId, 'Deal not found')
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const { data } = await this.supabase.client
      .from('user_interactions')
      .select('*')
      .eq('deal_id', dealId)
      .gt('created_at', since.toISOString())
      .order('created_at', { ascending: false })
    return data ?? []
  }

  async getViewCount(dealId: string): Promise<number> {
    assertUuid(dealId, 'Deal not found')
    const { count } = await this.supabase.client
      .from('user_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('deal_id', dealId)
      .eq('action', 'view')
    return count ?? 0
  }
}
