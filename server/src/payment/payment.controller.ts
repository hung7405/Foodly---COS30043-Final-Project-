import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PaymentService } from './payment.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { User } from '../users/entities/user.entity'

@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('reservations/:reservationId/pay')
  createPayment(
    @Param('reservationId') reservationId: string,
    @Body('provider') provider: string,
    @CurrentUser() user: User,
  ) {
    return this.paymentService.createPayment(user.id, reservationId, provider as any)
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id/confirm')
  async confirmPayment(@Param('id') id: string, @Body('providerResponse') providerResponse: any, @CurrentUser() user: User) {
    const payment = await this.paymentService.findById(id)
    if (!payment) throw new NotFoundException('Payment not found')
    if (payment.userId !== user.id && user.role !== 'admin') throw new UnauthorizedException()
    return this.paymentService.confirmPayment(id, providerResponse)
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id/fail')
  async failPayment(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() user: User) {
    const payment = await this.paymentService.findById(id)
    if (!payment) throw new NotFoundException('Payment not found')
    if (payment.userId !== user.id && user.role !== 'admin') throw new UnauthorizedException()
    return this.paymentService.failPayment(id, reason)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Put(':id/refund')
  refundPayment(@Param('id') id: string) {
    return this.paymentService.refundPayment(id)
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  myPayments(@CurrentUser() user: User) {
    return this.paymentService.findByUser(user.id)
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  getPayment(@Param('id') id: string) {
    return this.paymentService.findById(id)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('stats/all')
  getStats() {
    return this.paymentService.getPaymentStats()
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id/complete-mock')
  async completeMockPayment(@Param('id') id: string, @CurrentUser() user: User) {
    const payment = await this.paymentService.findById(id)
    if (!payment) throw new NotFoundException('Payment not found')
    if (payment.userId !== user.id && user.role !== 'admin') throw new UnauthorizedException()
    return this.paymentService.confirmPayment(id, { mock: true, completedAt: new Date().toISOString() })
  }
}
