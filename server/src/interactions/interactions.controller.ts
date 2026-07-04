import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { InteractionsService } from './interactions.service'
import { InteractionAction } from './entities/interaction.entity'

@Controller('interactions')
export class InteractionsController {
  constructor(private interactionsService: InteractionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async record(
    @Body() body: { dealId: string; action: InteractionAction; weight?: number },
    @Req() req: any,
  ) {
    return this.interactionsService.record({
      userId: req.user.id,
      dealId: body.dealId,
      action: body.action,
      weight: body.weight,
    })
  }

  @Post('anonymous')
  async recordAnonymous(
    @Body() body: { dealId: string; action: InteractionAction },
  ) {
    return this.interactionsService.record({
      dealId: body.dealId,
      action: body.action,
      weight: 0.5,
    })
  }
}
