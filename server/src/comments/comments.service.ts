import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Comment, CommentStatus } from './entities/comment.entity'
import { Deal } from '../deals/entities/deal.entity'
import { SocketGateway } from '../socket/socket.gateway'
import { AnalyticsService } from '../analytics/analytics.service'

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(Deal)
    private dealRepository: Repository<Deal>,
    private socketGateway: SocketGateway,
    private analyticsService: AnalyticsService,
  ) {}

  async findByDeal(dealId: string) {
    const comments = await this.commentRepository.find({
      where: { dealId, status: CommentStatus.ACTIVE },
      relations: { user: true, replies: { user: true } },
      order: { createdAt: 'DESC' },
    })
    return comments.map(comment => this.sanitizeComment(comment))
  }

  async create(dealId: string, userId: string, content: string, parentId?: string) {
    if (!content?.trim()) throw new BadRequestException('Comment cannot be empty')
    const deal = await this.dealRepository.findOne({ where: { id: dealId } })
    if (!deal) throw new NotFoundException('Deal not found')
    const comment = this.commentRepository.create({ dealId, userId, content: content.trim(), parentId })
    const saved = await this.commentRepository.save(comment)
    await this.dealRepository.increment({ id: dealId }, 'commentCount', 1)
    const fullComment = await this.commentRepository.findOne({ where: { id: saved.id }, relations: { user: true } })
    this.socketGateway.emitCommentAdded(fullComment)
    this.analyticsService.recordEvent({ userId, eventType: 'comment_added', dealId }).catch(() => {})
    return this.sanitizeComment(fullComment)
  }

  async update(id: string, content: string, userId: string) {
    const comment = await this.commentRepository.findOne({ where: { id } })
    if (!comment) throw new NotFoundException('Comment not found')
    if (comment.userId !== userId) throw new ForbiddenException('Not your comment')
    if (!content?.trim()) throw new BadRequestException('Comment cannot be empty')
    comment.content = content.trim()
    return this.sanitizeComment(await this.commentRepository.save(comment))
  }

  async remove(id: string, userId: string, userRole: string) {
    const comment = await this.commentRepository.findOne({ where: { id } })
    if (!comment) throw new NotFoundException('Comment not found')
    if (comment.userId !== userId && userRole !== 'admin' && userRole !== 'moderator') {
      throw new ForbiddenException('Cannot delete this comment')
    }
    comment.status = CommentStatus.HIDDEN
    const saved = await this.commentRepository.save(comment)
    await this.dealRepository.decrement({ id: comment.dealId }, 'commentCount', 1)
    return this.sanitizeComment(saved)
  }

  private sanitizeComment(comment: any) {
    if (!comment) return comment
    if (comment.user?.passwordHash) {
      const { passwordHash, ...safeUser } = comment.user
      comment.user = safeUser
    }
    if (comment.replies) {
      comment.replies = comment.replies.map((reply: any) => this.sanitizeComment(reply))
    }
    return comment
  }
}
