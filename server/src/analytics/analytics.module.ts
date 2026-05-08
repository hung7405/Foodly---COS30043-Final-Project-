import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'
import { AnalyticsGateway } from './analytics.gateway'
import { ActivityEvent, AnalyticsSnapshot } from './entities/analytics.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ActivityEvent, AnalyticsSnapshot])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsGateway],
  exports: [AnalyticsService, AnalyticsGateway],
})
export class AnalyticsModule {}
