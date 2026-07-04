import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { RecommendationService } from './recommendation.service'

const FLASH_SALE_DURATION_MS = 3 * 3600 * 1000 // 3 hours each round

@Controller('recommendations')
export class RecommendationController {
  constructor(private recommendationService: RecommendationService) {}

  @Get('flash-sale')
  async getFlashSale() {
    const now = Date.now()
    const endTime = new Date(now + FLASH_SALE_DURATION_MS).toISOString()
    return { endTime }
  }

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
