import { Controller, Get, Post, Put, Delete, Param, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ReservationsService } from './reservations.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { User } from '../users/entities/user.entity'

@Controller()
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('deals/:dealId/reserve')
  reserve(@Param('dealId') dealId: string, @CurrentUser() user: User) {
    return this.reservationsService.reserve(dealId, user.id)
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('reservations')
  myReservations(@CurrentUser() user: User) {
    return this.reservationsService.findByUser(user.id)
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('reservations/:id/confirm')
  confirm(@Param('id') id: string, @CurrentUser() user: User) {
    return this.reservationsService.confirm(id, user.id)
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('reservations/:id')
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.reservationsService.cancel(id, user.id)
  }
}
