import { Module } from '@nestjs/common'
import { ReservationsController } from './reservations.controller'
import { ReservationsService } from './reservations.service'
import { SocketModule } from '../socket/socket.module'
import { AnalyticsModule } from '../analytics/analytics.module'

@Module({
  imports: [SocketModule, AnalyticsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
