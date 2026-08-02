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

  private static readonly EDITABLE_FIELDS = ['name', 'address', 'latitude', 'longitude', 'category'] as const

  async create(data: Record<string, any>) {
    const payload: Record<string, any> = {}
    for (const field of StoresService.EDITABLE_FIELDS) {
      if (data[field] !== undefined) payload[field] = data[field]
    }
    const { data: store, error } = await this.supabase.client
      .from('stores')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return store
  }

  async update(id: string, data: Record<string, any>) {
    const { data: existing } = await this.supabase.client
      .from('stores')
      .select('id')
      .eq('id', id)
      .single()
    if (!existing) throw new Error('Store not found')

    const payload: Record<string, any> = {}
    for (const field of StoresService.EDITABLE_FIELDS) {
      if (data[field] !== undefined) payload[field] = data[field]
    }
    if (Object.keys(payload).length === 0) throw new Error('No editable fields provided')

    const { data: store, error } = await this.supabase.client
      .from('stores')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return store
  }
}
