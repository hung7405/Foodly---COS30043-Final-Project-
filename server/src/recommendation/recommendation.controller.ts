import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { RecommendationService } from './recommendation.service'

@Controller('recommendations')
export class RecommendationController {
  constructor(private recommendationService: RecommendationService) {}

  @Get()
  async getRecommendations(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const userId = req.user?.id
    return this.recommendationService.getRecommendations({
      userId,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      limit: limit ? Number(limit) : 20,
    })
  }
}
