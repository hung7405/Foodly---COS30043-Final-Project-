import { Controller, Get, Query } from '@nestjs/common'
import { FeedService } from './feed.service'

@Controller('feed')
export class FeedController {
  constructor(private feedService: FeedService) {}

  @Get()
  getRecent(@Query('limit') limit?: string) {
    return this.feedService.getRecent(limit ? Number(limit) : 30)
  }
}