import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'

@Injectable()
export class StoresService {
  constructor(private supabase: SupabaseService) {}

  async findAll() {
    const { data } = await this.supabase.client
      .from('stores')
      .select('*')
      .eq('is_active', true)
    return data ?? []
  }

  async findById(id: string) {
    const { data } = await this.supabase.client
      .from('stores')
      .select('*, deals(*)')
      .eq('id', id)
      .single()
    return data
  }

  async create(data: Record<string, any>) {
    const { data: store, error } = await this.supabase.client
      .from('stores')
      .insert(data)
      .select()
      .single()
    if (error) throw error
    return store
  }

  async update(id: string, data: Record<string, any>) {
    const { data: store, error } = await this.supabase.client
      .from('stores')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return store
  }
}
