import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'

@Injectable()
export class SupportService {
  constructor(private supabase: SupabaseService) {}

  async createTicket(userId: string, data: { category?: string; subject?: string; message: string }) {
    const { data: ticket, error } = await this.supabase.client
      .from('support_tickets')
      .insert({
        user_id: userId,
        category: data.category ?? 'general',
        subject: data.subject ?? null,
        message: data.message,
        status: 'open',
      })
      .select()
      .single()
    if (error) throw error
    return ticket
  }

  async findMine(userId: string) {
    const { data, error } = await this.supabase.client
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }
}
