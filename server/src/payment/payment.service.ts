import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { SupabaseService } from '../supabase/supabase.service'
import { PaymentProvider, PaymentStatus } from './entities/payment.entity'
import { ReservationStatus } from '../reservations/entities/reservation.entity'
import { SocketGateway } from '../socket/socket.gateway'
import * as crypto from 'crypto'

@Injectable()
export class PaymentService {
  constructor(
    private supabase: SupabaseService,
    private socketGateway: SocketGateway,
  ) {}

  async createPayment(userId: string, reservationId: string, provider = PaymentProvider.MOCK) {
    const { data: reservation, error: reservationError } = await this.supabase.client
      .from('reservations')
      .select('*, deal:deal_id(*)')
      .eq('id', reservationId)
      .eq('user_id', userId)
      .single()
    if (reservationError || !reservation) throw new NotFoundException('Reservation not found')
    if (reservation.status !== ReservationStatus.ACTIVE) throw new BadRequestException('Reservation is not active')

    const { data: existing } = await this.supabase.client
      .from('payments')
      .select('*')
      .eq('reservation_id', reservationId)
      .eq('status', PaymentStatus.PENDING)
      .maybeSingle()
    if (existing) return existing

    const amount = Number(reservation.deal.discount_price) * reservation.quantity_reserved

    const { data: payment, error: insertError } = await this.supabase.client
      .from('payments')
      .insert({
        user_id: userId,
        reservation_id: reservationId,
        amount,
        currency: 'VND',
        provider,
        status: PaymentStatus.PENDING,
      })
      .select()
      .single()
    if (insertError) throw insertError

    return this.processPayment(payment)
  }

  private async processPayment(payment: any) {
    if (payment.provider === PaymentProvider.MOCK) {
      return this.processMockPayment(payment)
    }
    if (payment.provider === PaymentProvider.MOMO) {
      return this.createMoMoPayment(payment)
    }
    if (payment.provider === PaymentProvider.VNPAY) {
      return this.createVNPayPayment(payment)
    }
    throw new BadRequestException('Unsupported payment provider')
  }

  private async processMockPayment(payment: any) {
    const transactionId = crypto.randomBytes(8).toString('hex')
    const qrContent = `MOCK_QR_${payment.id}_${transactionId}`

    const { data, error } = await this.supabase.client
      .from('payments')
      .update({
        provider: PaymentProvider.MOCK,
        provider_transaction_id: transactionId,
        qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrContent}`,
        payment_url: `https://mock-pay.foodly.app/${payment.id}`,
        status: PaymentStatus.PROCESSING,
      })
      .eq('id', payment.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  private async createMoMoPayment(payment: any) {
    const transactionId = `MOMO_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`

    const { data, error } = await this.supabase.client
      .from('payments')
      .update({
        provider_transaction_id: transactionId,
        qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=2|99|${payment.amount}|${transactionId}|foodly`,
        payment_url: `momo://payment?partnerCode=MOMO&orderId=${transactionId}&amount=${payment.amount}`,
        status: PaymentStatus.PROCESSING,
      })
      .eq('id', payment.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  private async createVNPayPayment(payment: any) {
    const transactionId = `VNPAY_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`

    const { data, error } = await this.supabase.client
      .from('payments')
      .update({
        provider_transaction_id: transactionId,
        qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=vnpay://${transactionId}?amount=${payment.amount}`,
        payment_url: `https://sandbox.vnpayment.vn/payment?vnp_TxnRef=${transactionId}&vnp_Amount=${payment.amount * 100}`,
        status: PaymentStatus.PROCESSING,
      })
      .eq('id', payment.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async confirmPayment(paymentId: string, providerResponse?: any) {
    const { data: payment, error: paymentError } = await this.supabase.client
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single()
    if (paymentError || !payment) throw new NotFoundException('Payment not found')

    // Idempotency: if a concurrent call already confirmed this payment, return
    // the already-successful payment instead of failing or double-awarding.
    if (payment.status === PaymentStatus.SUCCESS) return payment
    if (payment.status !== PaymentStatus.PROCESSING) throw new BadRequestException('Payment is not in processing state')

    // Atomic PROCESSING -> SUCCESS transition. Only the first caller wins; a
    // concurrent confirm sees 0 rows and returns idempotently below.
    const { data: confirmed, error: updatePaymentError } = await this.supabase.client
      .from('payments')
      .update({
        status: PaymentStatus.SUCCESS,
        paid_at: new Date().toISOString(),
        provider_response: providerResponse || null,
      })
      .eq('id', paymentId)
      .eq('status', PaymentStatus.PROCESSING)
      .select()
      .maybeSingle()
    if (updatePaymentError) throw updatePaymentError
    if (!confirmed) {
      const { data: recheck } = await this.supabase.client
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single()
      if (recheck?.status === PaymentStatus.SUCCESS) return recheck
      throw new BadRequestException('Payment is not in processing state')
    }

    // Confirm the reservation only if it is still ACTIVE. A cancelled or
    // expired reservation is never resurrected to confirmed.
    const { error: updateReservationError } = await this.supabase.client
      .from('reservations')
      .update({
        status: ReservationStatus.CONFIRMED,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', payment.reservation_id)
      .eq('status', ReservationStatus.ACTIVE)
    if (updateReservationError) throw updateReservationError

    await this.awardLoyaltyPoints(payment.user_id, Number(payment.amount))

    this.socketGateway.emitReservationConfirmed(payment.reservation_id)
    return confirmed
  }

  private async awardLoyaltyPoints(userId: string, amount: number) {
    if (!userId || !amount) return
    const points = Math.max(1, Math.round(amount / 1000))
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: user } = await this.supabase.client
        .from('users')
        .select('reputation_points')
        .eq('id', userId)
        .single()
      const current = user?.reputation_points ?? 0
      const next = current + points
      const { data: updated } = await this.supabase.client
        .from('users')
        .update({ reputation_points: next })
        .eq('id', userId)
        .eq('reputation_points', current)
        .select('reputation_points')
        .maybeSingle()
      if (updated) {
        this.socketGateway.server?.to(`user:${userId}`).emit('points:awarded', { points, balance: next, reason: 'purchase' })
        return
      }
    }
  }

  async failPayment(paymentId: string, reason: string) {
    const { data: payment, error: fetchError } = await this.supabase.client
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single()
    if (fetchError || !payment) throw new NotFoundException('Payment not found')

    const { data, error } = await this.supabase.client
      .from('payments')
      .update({ status: PaymentStatus.FAILED, failure_reason: reason })
      .eq('id', paymentId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async refundPayment(paymentId: string) {
    const { data: payment, error: fetchError } = await this.supabase.client
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single()
    if (fetchError || !payment) throw new NotFoundException('Payment not found')
    if (payment.status !== PaymentStatus.SUCCESS) throw new BadRequestException('Only successful payments can be refunded')

    const { data, error } = await this.supabase.client
      .from('payments')
      .update({ status: PaymentStatus.REFUNDED, refunded_at: new Date().toISOString() })
      .eq('id', paymentId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async findByUser(userId: string) {
    const { data, error } = await this.supabase.client
      .from('payments')
      .select('*, reservation:reservation_id(*, deal:deal_id(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async findById(id: string) {
    const { data, error } = await this.supabase.client
      .from('payments')
      .select('*, reservation:reservation_id(*, deal:deal_id(*)), user:user_id(id,email,username,first_name,last_name,role,avatar_url,trust_score,reputation_points,is_active,created_at,updated_at,last_login)')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return data
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async expirePendingPayments() {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)

    const { data: expired, error } = await this.supabase.client
      .from('payments')
      .select('*')
      .in('status', [PaymentStatus.PROCESSING, PaymentStatus.PENDING])
      .lt('created_at', fiveMinAgo.toISOString())

    if (error) throw error
    const list = expired || []

    for (const payment of list) {
      // Atomic state guard: only expire if the payment is still in the state we
      // fetched. A concurrent confirmPayment may have moved it to SUCCESS.
      await this.supabase.client
        .from('payments')
        .update({ status: PaymentStatus.EXPIRED })
        .eq('id', payment.id)
        .eq('status', payment.status)
    }

    return list.length
  }

  async getPaymentStats() {
    const { count: total } = await this.supabase.client
      .from('payments')
      .select('*', { count: 'exact', head: true })

    const { count: success } = await this.supabase.client
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', PaymentStatus.SUCCESS)

    const { count: failed } = await this.supabase.client
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', PaymentStatus.FAILED)

    const { count: pending } = await this.supabase.client
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', PaymentStatus.PENDING)

    const { count: refunded } = await this.supabase.client
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', PaymentStatus.REFUNDED)

    let revenue = 0
    const { data: completedPayments } = await this.supabase.client
      .from('payments')
      .select('amount')
      .eq('status', PaymentStatus.SUCCESS)
    if (completedPayments) {
      revenue = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    }

    return { total: total ?? 0, success: success ?? 0, failed: failed ?? 0, pending: pending ?? 0, refunded: refunded ?? 0, revenue }
  }
}
