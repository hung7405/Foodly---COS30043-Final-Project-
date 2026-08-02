import { Controller, Get, Put, Param, Query, Body, UseGuards, BadRequestException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { MerchantService } from './merchant.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { User } from '../users/entities/user.entity'

@Controller('merchant')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('merchant', 'admin')
export class MerchantController {
  constructor(private merchantService: MerchantService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return this.merchantService.getProfile(user.id)
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: User) {
    return this.merchantService.getDashboard(user.id)
  }

  @Get('orders')
  getOrders(@CurrentUser() user: User, @Query('status') status?: string) {
    return this.merchantService.getOrders(user.id, status)
  }

  @Put('orders/:id/confirm')
  confirmPickup(@CurrentUser() user: User, @Param('id') id: string) {
    return this.merchantService.confirmPickup(user.id, id)
  }

  @Get('deals')
  getDeals(@CurrentUser() user: User) {
    return this.merchantService.getDeals(user.id)
  }

  @Put('deals/:id/status')
  setDealActive(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('active') active: boolean,
  ) {
    if (typeof active !== 'boolean') throw new BadRequestException('Invalid payload')
    return this.merchantService.setDealActive(user.id, id, active)
  }
}
