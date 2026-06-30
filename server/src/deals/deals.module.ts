import { Module } from '@nestjs/common'
import { DealsController } from './deals.controller'
import { DealsService } from './deals.service'
import { SocketModule } from '../socket/socket.module'
import { AnalyticsModule } from '../analytics/analytics.module'

@Module({
  imports: [SocketModule, AnalyticsModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
