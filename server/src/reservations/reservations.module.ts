import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ReservationsController } from './reservations.controller'
import { ReservationsService } from './reservations.service'
import { Reservation } from './entities/reservation.entity'
import { Deal } from '../deals/entities/deal.entity'
import { SocketModule } from '../socket/socket.module'
import { AnalyticsModule } from '../analytics/analytics.module'

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Deal]), SocketModule, AnalyticsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
