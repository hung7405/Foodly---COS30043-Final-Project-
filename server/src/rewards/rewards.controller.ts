import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { RewardsService } from './rewards.service'

@Controller('rewards')
export class RewardsController {
  constructor(private rewardsService: RewardsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('impact')
  impact(@Req() req: any) {
    return this.rewardsService.getImpact(req.user.id)
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('balance')
  balance(@Req() req: any) {
    return this.rewardsService.getBalance(req.user.id)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('daily-spin')
  dailySpin(@Req() req: any) {
    return this.rewardsService.dailySpin(req.user.id)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('redeem')
  redeem(@Req() req: any, @Body() body: { points: number }) {
    return this.rewardsService.redeem(req.user.id, body.points)
  }
}
