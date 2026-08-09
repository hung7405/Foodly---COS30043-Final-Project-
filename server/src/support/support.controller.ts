import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { SupportService } from './support.service'
import { CreateTicketDto } from './dto/create-ticket.dto'
import { CreateFeedbackDto } from './dto/create-feedback.dto'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { User } from '../users/entities/user.entity'

@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('tickets')
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: User) {
    return this.supportService.createTicket(user.id, dto)
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('tickets')
  findMine(@CurrentUser() user: User) {
    return this.supportService.findMine(user.id)
  }

  @Post('feedback')
  createFeedback(@Body() dto: CreateFeedbackDto, @CurrentUser() user?: User) {
    return this.supportService.createFeedback(user?.id ?? null, dto)
  }
}
