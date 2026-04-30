import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Deal } from '../deals/entities/deal.entity'
import { Reservation } from '../reservations/entities/reservation.entity'
import { Like } from '../deals/entities/like.entity'
import { Bookmark } from '../deals/entities/bookmark.entity'
import { RecommendationController } from './recommendation.controller'
import { RecommendationService } from './recommendation.service'

@Module({
  imports: [TypeOrmModule.forFeature([Deal, Reservation, Like, Bookmark])],
  controllers: [RecommendationController],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule {}
