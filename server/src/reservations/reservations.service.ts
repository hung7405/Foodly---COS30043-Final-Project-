import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { SupabaseService } from '../supabase/supabase.service'
import { ReservationStatus } from './entities/reservation.entity'
import { DealStatus } from '../deals/entities/deal.entity'
import { PaymentStatus } from '../payment/entities/payment.entity'
import { SocketGateway } from '../socket/socket.gateway'
import { AnalyticsService } from '../analytics/analytics.service'
import * as crypto from 'crypto'

@Injectable()
export class ReservationsService {
  constructor(
    private supabase: SupabaseService,
    private socketGateway: SocketGateway,
    private analyticsService: AnalyticsService,
  ) {}

  async reserve(dealId: string, userId: string) {
    const { data: deal, error: dealError } = await this.supabase.client
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single()

    if (dealError || !deal) throw new NotFoundException('Deal not found')
    if (deal.user_id === userId) throw new BadRequestException('You cannot reserve your own deal')
    if (deal.remaining_quantity <= 0) throw new BadRequestException('No items remaining')
    if (deal.status !== DealStatus.ACTIVE) throw new BadRequestException('Deal is not available')

    const { data: activeReservation } = await this.supabase.client
      .from('reservations')
      .select('*')
      .eq('deal_id', dealId)
      .eq('user_id', userId)
      .eq('status', ReservationStatus.ACTIVE)
      .maybeSingle()
    if (activeReservation) throw new ConflictException('You already have an active reservation for this deal')

    const code = crypto.randomBytes(4).toString('hex').toUpperCase()

    const { data: currentDeal, error: currentError } = await this.supabase.client
      .from('deals')
      .select('remaining_quantity, version')
      .eq('id', dealId)
      .single()
    if (currentError || !currentDeal) throw new NotFoundException('Deal not found')
    if (currentDeal.remaining_quantity <= 0) throw new BadRequestException('No items remaining')

    const { data: updatedDeal, error: updateError } = await this.supabase.client
      .from('deals')
      .update({ remaining_quantity: currentDeal.remaining_quantity - 1, version: currentDeal.version + 1 })
      .eq('id', dealId)
      .eq('version', currentDeal.version)
      .select()
      .single()

    if (updateError || !updatedDeal) {
      throw new ConflictException('Concurrent reservation conflict — please try again')
    }

    const { data: reservation, error: insertError } = await this.supabase.client
      .from('reservations')
      .insert({
        deal_id: dealId,
        user_id: userId,
        status: ReservationStatus.ACTIVE,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        reservation_code: code,
      })
      .select()
      .single()

    if (insertError) throw insertError

    this.socketGateway.emitReservationCreated(reservation)
    this.socketGateway.emitDealQuantity(dealId, updatedDeal.remaining_quantity)
    this.analyticsService.recordEvent({ userId, eventType: 'reservation_made', dealId }).catch(() => {})
    this.supabase.client.from('user_interactions').insert({ user_id: userId, deal_id: dealId, action: 'reserve' }).then(undefined, () => {})
    return reservation
  }

  async findByUser(userId: string) {
    const { data, error } = await this.supabase.client
      .from('reservations')
      .select('*, deal:deal_id(*)')
      .eq('user_id', userId)
      .order('reserved_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async confirm(id: string, userId: string) {
    const { data: reservation, error: fetchError } = await this.supabase.client
      .from('reservations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (fetchError || !reservation) throw new NotFoundException('Reservation not found')

    // A reservation can only be confirmed once its payment has succeeded.
    // Prevents confirming pickup on an unpaid hold (which used to be possible
    // by reserving, leaving the payment page, and confirming from My Reservations).
    const { data: paidPayment, error: paymentError } = await this.supabase.client
      .from('payments')
      .select('id, status')
      .eq('reservation_id', id)
      .eq('status', PaymentStatus.SUCCESS)
      .maybeSingle()
    if (paymentError) throw paymentError
    if (!paidPayment) {
      throw new BadRequestException('Payment is required before you can confirm pickup')
    }

    // Only an ACTIVE reservation can be confirmed (atomic guard against
    // double-confirm / confirm-after-expiry races).
    const { data, error } = await this.supabase.client
      .from('reservations')
      .update({ status: ReservationStatus.CONFIRMED, confirmed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', ReservationStatus.ACTIVE)
      .select()
      .single()
    if (error) throw error
    if (!data) throw new BadRequestException('Reservation is not active')
    return data
  }

  async cancel(id: string, userId: string) {
    const { data: reservation, error: fetchError } = await this.supabase.client
      .from('reservations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (fetchError || !reservation) throw new NotFoundException('Reservation not found')

    // Atomic ACTIVE -> CANCELLED transition. Only the first caller succeeds;
    // repeat cancels or cancel-after-expiry no longer double-restore stock.
    const { data: cancelled, error: updateError } = await this.supabase.client
      .from('reservations')
      .update({ status: ReservationStatus.CANCELLED })
      .eq('id', id)
      .eq('status', ReservationStatus.ACTIVE)
      .select()
      .single()
    if (updateError) throw updateError
    if (!cancelled) throw new BadRequestException('Reservation is not active')

    const { data: deal } = await this.supabase.client
      .from('deals')
      .select('remaining_quantity, version')
      .eq('id', reservation.deal_id)
      .single()

    if (deal) {
      await this.supabase.client
        .from('deals')
        .update({ remaining_quantity: deal.remaining_quantity + reservation.quantity_reserved, version: deal.version + 1 })
        .eq('id', reservation.deal_id)
    }

    const { data: updatedDeal } = await this.supabase.client
      .from('deals')
      .select('remaining_quantity')
      .eq('id', reservation.deal_id)
      .single()
    this.socketGateway.emitDealQuantity(reservation.deal_id, updatedDeal?.remaining_quantity ?? 0)
    return cancelled
  }

  async expireReservations() {
    const { data: expired, error } = await this.supabase.client
      .from('reservations')
      .select('*')
      .eq('status', ReservationStatus.ACTIVE)
      .lt('expires_at', new Date().toISOString())

    if (error) throw error
    const list = expired || []

    for (const reservation of list) {
      try {
        await this.expireReservation(reservation)
      } catch {
        // Log and continue
      }
    }

    return list.length
  }

  @Cron('*/60 * * * * *')
  async expireReservationsJob() {
    await this.expireReservations()
  }

  private async expireReservation(reservation: any) {
    // Atomic ACTIVE -> EXPIRED transition; if a user cancelled the same
    // reservation concurrently, this update affects 0 rows and we skip
    // the stock restore (no double-increment).
    const { data: expired, error: updateError } = await this.supabase.client
      .from('reservations')
      .update({ status: ReservationStatus.EXPIRED })
      .eq('id', reservation.id)
      .eq('status', ReservationStatus.ACTIVE)
      .select()
      .single()
    if (updateError) throw updateError
    if (!expired) return

    const { data: deal } = await this.supabase.client
      .from('deals')
      .select('remaining_quantity, version')
      .eq('id', reservation.deal_id)
      .single()

    if (deal) {
      await this.supabase.client
        .from('deals')
        .update({ remaining_quantity: deal.remaining_quantity + reservation.quantity_reserved, version: deal.version + 1 })
        .eq('id', reservation.deal_id)
    }

    this.socketGateway.emitReservationExpired(reservation.id, reservation.deal_id)
    const { data: updatedDeal } = await this.supabase.client
      .from('deals')
      .select('remaining_quantity')
      .eq('id', reservation.deal_id)
      .single()
    this.socketGateway.emitDealQuantity(reservation.deal_id, updatedDeal?.remaining_quantity ?? 0)
  }
}
