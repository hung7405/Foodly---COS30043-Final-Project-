import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { SupabaseService } from '../supabase/supabase.service'

@Injectable()
export class AuthService {
  constructor(
    private supabase: SupabaseService,
    private jwtService: JwtService,
  ) {}

  async register(email: string, username: string, password: string, firstName?: string, lastName?: string) {
    const { data: existing } = await this.supabase.client
      .from('users')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle()
    if (existing) {
      throw new ConflictException('Email or username already exists')
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const { data: user, error } = await this.supabase.client
      .from('users')
      .insert({
        email,
        username,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
      })
      .select()
      .single()
    if (error) throw error

    const token = this.jwtService.sign({ id: user.id, email: user.email, role: user.role })
    return { user: this.sanitizeUser(user), token }
  }

  async login(email: string, password: string) {
    const { data: user, error } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    if (!user || error) throw new UnauthorizedException('Invalid credentials')

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) throw new UnauthorizedException('Invalid credentials')

    const { error: updateError } = await this.supabase.client
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)
    if (updateError) throw updateError

    const token = this.jwtService.sign({ id: user.id, email: user.email, role: user.role })
    return { user: this.sanitizeUser(user), token }
  }

  async getProfile(id: string) {
    const { data: user, error } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    if (!user || error) throw new UnauthorizedException('User not found')
    return this.sanitizeUser(user)
  }

  async updateProfile(id: string, data: Record<string, any> & { password?: string }) {
    const updateData: Record<string, any> = {}
    if (data.firstName !== undefined) updateData.first_name = data.firstName
    if (data.lastName !== undefined) updateData.last_name = data.lastName
    if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl
    if (data.deliveryAddress !== undefined) updateData.delivery_address = data.deliveryAddress
    if (data.password) updateData.password_hash = await bcrypt.hash(data.password, 12)
    if (Object.keys(updateData).length > 0) {
      await this.supabase.client.from('users').update(updateData).eq('id', id)
    }
    return this.getProfile(id)
  }

  private sanitizeUser(user: Record<string, any>) {
    const { password_hash, ...rest } = user
    return rest
  }
}
