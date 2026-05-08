import { Controller, Get, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { AnalyticsService } from './analytics.service'

@Controller('analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('live')
  getLive() {
    return this.analyticsService.computeLiveMetrics()
  }

  @Get('history')
  getHistory() {
    return this.analyticsService.getHistory()
  }
}
