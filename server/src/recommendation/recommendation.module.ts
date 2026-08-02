import { Module } from '@nestjs/common'
import { RecommendationController } from './recommendation.controller'
import { RecommendationService } from './recommendation.service'
import { EmbeddingModule } from '../embedding/embedding.module'

@Module({
  imports: [EmbeddingModule],
  controllers: [RecommendationController],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule {}
