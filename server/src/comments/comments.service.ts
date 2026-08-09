import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import { assertUuid } from '../common/uuid'
import { SocketGateway } from '../socket/socket.gateway'
import { AnalyticsService } from '../analytics/analytics.service'

@Injectable()
export class CommentsService {
  constructor(
    private supabaseService: SupabaseService,
    private socketGateway: SocketGateway,
    private analyticsService: AnalyticsService,
  ) {}

  async findByDeal(dealId: string) {
    assertUuid(dealId, 'Deal not found')

    const { data: comments, error } = await this.supabaseService.client
      .from('comments')
      .select('*, user:user_id(id,email,username,first_name,last_name,role,avatar_url,trust_score,reputation_points,is_active,created_at,updated_at,last_login), replies:comments!parent_id(*, user:user_id(id,email,username,first_name,last_name,role,avatar_url,trust_score,reputation_points,is_active,created_at,updated_at,last_login)))')
      .eq('deal_id', dealId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw error
    return (comments || []).map(comment => this.sanitizeComment(comment))
  }

  async create(dealId: string, userId: string, content: string, parentId?: string) {
    if (!content?.trim()) throw new BadRequestException('Comment cannot be empty')

    const { data: deal, error: dealError } = await this.supabaseService.client
      .from('deals')
      .select('id')
      .eq('id', dealId)
      .single()
    if (dealError || !deal) throw new NotFoundException('Deal not found')

    const { data: saved, error: insertError } = await this.supabaseService.client
      .from('comments')
      .insert({ deal_id: dealId, user_id: userId, content: content.trim(), parent_id: parentId || null })
      .select('*, user:user_id(id,email,username,first_name,last_name,role,avatar_url,trust_score,reputation_points,is_active,created_at,updated_at,last_login)')
      .single()
    if (insertError) throw insertError

    const { data: current } = await this.supabaseService.client
      .from('deals')
      .select('comment_count')
      .eq('id', dealId)
      .single()
    await this.supabaseService.client
      .from('deals')
      .update({ comment_count: (current?.comment_count || 0) + 1 })
      .eq('id', dealId)

    this.socketGateway.emitCommentAdded(saved)
    this.analyticsService.recordEvent({ userId, eventType: 'comment_added', dealId }).catch(() => {})
    return this.sanitizeComment(saved)
  }

  async update(id: string, content: string, userId: string) {
    assertUuid(id, 'Comment not found')
    const { data: comment, error: findError } = await this.supabaseService.client
      .from('comments')
      .select('*')
      .eq('id', id)
      .single()
    if (findError || !comment) throw new NotFoundException('Comment not found')
    if (comment.user_id !== userId) throw new ForbiddenException('Not your comment')
    if (!content?.trim()) throw new BadRequestException('Comment cannot be empty')

    const { data: updated, error: updateError } = await this.supabaseService.client
      .from('comments')
      .update({ content: content.trim() })
      .eq('id', id)
      .select('*')
      .single()
    if (updateError) throw updateError
    return this.sanitizeComment(updated)
  }

  async remove(id: string, userId: string, userRole: string) {
    assertUuid(id, 'Comment not found')
    const { data: comment, error: findError } = await this.supabaseService.client
      .from('comments')
      .select('*')
      .eq('id', id)
      .single()
    if (findError || !comment) throw new NotFoundException('Comment not found')
    if (comment.user_id !== userId && userRole !== 'admin' && userRole !== 'moderator') {
      throw new ForbiddenException('Cannot delete this comment')
    }

    const { data: updated, error: updateError } = await this.supabaseService.client
      .from('comments')
      .update({ status: 'hidden' })
      .eq('id', id)
      .select('*')
      .single()
    if (updateError) throw updateError

    const { data: current } = await this.supabaseService.client
      .from('deals')
      .select('comment_count')
      .eq('id', comment.deal_id)
      .single()
    await this.supabaseService.client
      .from('deals')
      .update({ comment_count: Math.max(0, (current?.comment_count || 0) - 1) })
      .eq('id', comment.deal_id)

    return this.sanitizeComment(updated)
  }

  private sanitizeComment(comment: any) {
    if (!comment) return comment
    if (comment.user?.password_hash) {
      const { password_hash, ...safeUser } = comment.user
      comment.user = safeUser
    }
    if (comment.replies) {
      comment.replies = comment.replies.map((reply: any) => this.sanitizeComment(reply))
    }
    return comment
  }
}
