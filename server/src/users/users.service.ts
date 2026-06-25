import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'

@Injectable()
export class UsersService {
  constructor(private supabase: SupabaseService) {}

  async findById(id: string) {
    const { data: user, error } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    if (!user || error) throw new NotFoundException('User not found')
    return this.sanitizeUser(user)
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const { data: users, count } = await this.supabase.client
      .from('users')
      .select('*', { count: 'exact' })
      .range(skip, skip + limit - 1)
      .order('created_at', { ascending: false })
    const total = count ?? 0
    return { users: (users ?? []).map(user => this.sanitizeUser(user)), total, page, totalPages: Math.ceil(total / limit) }
  }

  async updateRole(id: string, role: string) {
    if (!['guest', 'user', 'moderator', 'admin'].includes(role)) throw new BadRequestException('Invalid role')
    const { data: user, error } = await this.supabase.client
      .from('users')
      .update({ role })
      .eq('id', id)
      .select()
      .single()
    if (!user || error) throw new NotFoundException('User not found')
    return this.sanitizeUser(user)
  }

  async toggleBan(id: string) {
    const { data: user, error: fetchError } = await this.supabase.client
      .from('users')
      .select('is_active')
      .eq('id', id)
      .single()
    if (!user || fetchError) throw new NotFoundException('User not found')
    const { data: updated, error } = await this.supabase.client
      .from('users')
      .update({ is_active: !user.is_active })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return this.sanitizeUser(updated)
  }

  private sanitizeUser(user: Record<string, any>) {
    const { password_hash, ...safeUser } = user
    return safeUser
  }
}
