import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseService } from '../supabase/supabase.service'
import { config } from '../config'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private supabaseService: SupabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    })
  }

  private get supabase(): SupabaseClient {
    return this.supabaseService.client
  }

  async validate(payload: { id: string; email: string; role: string }) {
    const { data: user, error } = await this.supabase.from('users').select('*').eq('id', payload.id).single()
    if (error || !user || !user.is_active) throw new UnauthorizedException()
    return user
  }
}
