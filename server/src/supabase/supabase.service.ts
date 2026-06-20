import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient
  private readonly logger = new Logger(SupabaseService.name)

  onModuleInit() {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SECRET_KEY
    if (!url || !key) {
      this.logger.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env')
      throw new Error('Supabase configuration missing')
    }
    this.supabase = createClient(url, key, {
      auth: { persistSession: false },
    })
    this.logger.log('Supabase client initialized')
  }

  get client(): SupabaseClient {
    return this.supabase
  }
}
