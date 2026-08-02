import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { SupabaseService } from '../supabase/supabase.service'
import { DealStatus } from '../deals/entities/deal.entity'

const EMBEDDING_MODEL = process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small'
const EMBEDDING_DIM = Number(process.env.AI_EMBEDDING_DIM || 1536)

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name)
  private readonly enabled = !!process.env.OPENAI_API_KEY

  constructor(
    private supabaseService: SupabaseService,
  ) {}

  private get supabase() {
    return this.supabaseService.client
  }

  get isEnabled() {
    return this.enabled
  }

  async generateEmbedding(text: string): Promise<number[] | null> {
    const key = process.env.OPENAI_API_KEY
    if (!key) return null
    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text.slice(0, 8000),
        }),
      })
      if (!res.ok) {
        this.logger.warn(`Embedding API ${res.status}: ${await res.text()}`)
        return null
      }
      const json = await res.json()
      return json?.data?.[0]?.embedding || null
    } catch (err) {
      this.logger.warn(`Embedding generation failed: ${(err as Error).message}`)
      return null
    }
  }

  dealContent(deal: any): string {
    return [
      deal.title,
      deal.description,
      deal.store?.name,
      Array.isArray(deal.tags) ? deal.tags.join(', ') : '',
    ].filter(Boolean).join(' | ')
  }

  /** Embed all active deals into the deal_embeddings sidecar table. Idempotent. */
  async backfill(limit = 500): Promise<{ embedded: number; skipped: number }> {
    if (!this.enabled) return { embedded: 0, skipped: 0 }

    const { data: deals, error } = await this.supabase
      .from('deals')
      .select('id,title,description,tags, store:stores(name)')
      .eq('status', DealStatus.ACTIVE)
      .limit(limit)
    if (error) throw error

    let embedded = 0
    let skipped = 0
    for (const deal of deals || []) {
      const content = this.dealContent(deal)
      if (!content.trim()) {
        skipped++
        continue
      }
      const embedding = await this.generateEmbedding(content)
      if (!embedding || embedding.length !== EMBEDDING_DIM) {
        skipped++
        continue
      }
      const { error: upsertError } = await this.supabase
        .from('deal_embeddings')
        .upsert(
          { deal_id: deal.id, content, model: EMBEDDING_MODEL, embedding },
          { onConflict: 'deal_id' },
        )
      if (upsertError) {
        this.logger.warn(`Embedding upsert failed for deal ${deal.id}: ${upsertError.message}`)
        continue
      }
      embedded++
    }

    return { embedded, skipped }
  }

  /** Vector similarity search. Returns map deal_id -> similarity (0..1). */
  async searchVector(queryEmbedding: number[], limit = 20): Promise<Record<string, number>> {
    if (!this.enabled || !queryEmbedding || queryEmbedding.length !== EMBEDDING_DIM) return {}

    const { data, error } = await this.supabase.rpc('match_deals', {
      query_embedding: queryEmbedding,
      match_count: limit,
    })

    if (error) {
      this.logger.warn(`Vector search failed: ${error.message}`)
      return {}
    }

    const map: Record<string, number> = {}
    for (const row of (data || []) as { deal_id: string; similarity: number }[]) {
      map[row.deal_id] = row.similarity
    }
    return map
  }

  @Cron('0 */10 * * * *')
  async backfillJob() {
    if (!this.enabled) return
    const result = await this.backfill()
    this.logger.log(`Embedding backfill: ${result.embedded} embedded, ${result.skipped} skipped`)
  }
}
