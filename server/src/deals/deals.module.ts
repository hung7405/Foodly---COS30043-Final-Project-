import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DealsController } from './deals.controller'
import { DealsService } from './deals.service'
import { Deal } from './entities/deal.entity'
import { Like } from './entities/like.entity'
import { Bookmark } from './entities/bookmark.entity'
import { VerificationEvent } from './entities/verification-event.entity'
import { SocketModule } from '../socket/socket.module'
import { AnalyticsModule } from '../analytics/analytics.module'

@Module({
  imports: [TypeOrmModule.forFeature([Deal, Like, Bookmark, VerificationEvent]), SocketModule, AnalyticsModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
