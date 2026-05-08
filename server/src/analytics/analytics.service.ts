import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan } from 'typeorm'
import { ActivityEvent, AnalyticsSnapshot } from './entities/analytics.entity'

@Injectable()
export class AnalyticsService {
  private eventBuffer: any[] = []

  constructor(
    @InjectRepository(ActivityEvent)
    private activityRepository: Repository<ActivityEvent>,
    @InjectRepository(AnalyticsSnapshot)
    private snapshotRepository: Repository<AnalyticsSnapshot>,
  ) {}

  async recordEvent(event: { userId: string; dealId?: string; eventType: string; metadata?: any }) {
    const activity = this.activityRepository.create(event)
    return this.activityRepository.save(activity)
  }

  async computeLiveMetrics() {
    const oneMinuteAgo = new Date(Date.now() - 60_000)

    const activeUsers = await this.activityRepository.count({
      where: { createdAt: MoreThan(oneMinuteAgo) },
    })

    const recentEvents = await this.activityRepository.find({
      where: { createdAt: MoreThan(oneMinuteAgo) },
    })

    const metrics = {
      activeUsers,
      reservationsPerMinute: recentEvents.filter(e => e.eventType === 'reservation_made').length,
      dealsPerMinute: recentEvents.filter(e => e.eventType === 'deal_created').length,
      verificationsTotal: recentEvents.filter(e => e.eventType === 'deal_verified').length,
      commentsTotal: recentEvents.filter(e => e.eventType === 'comment_added').length,
      timestamp: new Date(),
    }

    const snapshot = this.snapshotRepository.create(metrics)
    await this.snapshotRepository.save(snapshot)

    return metrics
  }

  async getHistory() {
    return this.snapshotRepository.find({
      order: { capturedAt: 'DESC' },
      take: 50,
    })
  }
}
