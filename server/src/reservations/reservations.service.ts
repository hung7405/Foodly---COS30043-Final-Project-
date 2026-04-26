import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Reservation, ReservationStatus } from './entities/reservation.entity'
import { Deal, DealStatus } from '../deals/entities/deal.entity'
import { SocketGateway } from '../socket/socket.gateway'
import { AnalyticsService } from '../analytics/analytics.service'
import * as crypto from 'crypto'

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(Deal)
    private dealRepository: Repository<Deal>,
    private dataSource: DataSource,
    private socketGateway: SocketGateway,
    private analyticsService: AnalyticsService,
  ) {}

  async reserve(dealId: string, userId: string) {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const deal = await queryRunner.manager
        .createQueryBuilder(Deal, 'deal')
        .where('deal.id = :id', { id: dealId })
        .getOne()

      if (!deal) throw new NotFoundException('Deal not found')
      if (deal.userId === userId) throw new BadRequestException('You cannot reserve your own deal')
      if (deal.remainingQuantity <= 0) throw new BadRequestException('No items remaining')
      if (deal.status !== DealStatus.ACTIVE) throw new BadRequestException('Deal is not available')

      const activeReservation = await queryRunner.manager.findOne(Reservation, {
        where: { dealId, userId, status: ReservationStatus.ACTIVE },
      })
      if (activeReservation) throw new ConflictException('You already have an active reservation for this deal')

      const code = crypto.randomBytes(4).toString('hex').toUpperCase()

      const reservation = queryRunner.manager.create(Reservation, {
        dealId,
        userId,
        status: ReservationStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        reservationCode: code,
      })

      await queryRunner.manager.save(reservation)

      const result = await queryRunner.manager
        .createQueryBuilder()
        .update(Deal)
        .set({ remainingQuantity: () => 'remainingQuantity - 1', version: () => 'version + 1' })
        .where('id = :id AND version = :version AND remainingQuantity > 0', { id: dealId, version: deal.version })
        .execute()

      if (result.affected === 0) {
        throw new ConflictException('Concurrent reservation conflict — please try again')
      }

      await queryRunner.commitTransaction()
      const updatedDeal = await this.dealRepository.findOne({ where: { id: dealId } })
      this.socketGateway.emitReservationCreated(reservation)
      this.socketGateway.emitDealQuantity(dealId, updatedDeal?.remainingQuantity ?? 0)
      this.analyticsService.recordEvent({ userId, eventType: 'reservation_made', dealId }).catch(() => {})
      return reservation
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  async findByUser(userId: string) {
    return this.reservationRepository.find({
      where: { userId },
      relations: { deal: true },
      order: { reservedAt: 'DESC' },
    })
  }

  async confirm(id: string, userId: string) {
    const reservation = await this.reservationRepository.findOne({ where: { id, userId } })
    if (!reservation) throw new NotFoundException('Reservation not found')
    reservation.status = ReservationStatus.CONFIRMED
    reservation.confirmedAt = new Date()
    return this.reservationRepository.save(reservation)
  }

  async cancel(id: string, userId: string) {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const reservation = await queryRunner.manager.findOne(Reservation, { where: { id, userId } })
      if (!reservation) throw new NotFoundException('Reservation not found')

      reservation.status = ReservationStatus.CANCELLED
      await queryRunner.manager.save(reservation)

      await queryRunner.manager
        .createQueryBuilder()
        .update(Deal)
        .set({ remainingQuantity: () => `remainingQuantity + ${reservation.quantityReserved}`, version: () => 'version + 1' })
        .where('id = :id', { id: reservation.dealId })
        .execute()

      await queryRunner.commitTransaction()
      const updatedDeal = await this.dealRepository.findOne({ where: { id: reservation.dealId } })
      this.socketGateway.emitDealQuantity(reservation.dealId, updatedDeal?.remainingQuantity ?? 0)
      return reservation
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  async expireReservations() {
    const expired = await this.reservationRepository
      .createQueryBuilder('r')
      .where('r.status = :status', { status: ReservationStatus.ACTIVE })
      .andWhere('r.expiresAt < :now', { now: new Date() })
      .getMany()

    for (const reservation of expired) {
      try {
        await this.expireReservation(reservation)
      } catch {
        // Log and continue
      }
    }

    return expired.length
  }

  @Cron('*/60 * * * * *')
  async expireReservationsJob() {
    await this.expireReservations()
  }

  private async expireReservation(reservation: Reservation) {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      reservation.status = ReservationStatus.EXPIRED
      await queryRunner.manager.save(reservation)
      await queryRunner.manager
        .createQueryBuilder()
        .update(Deal)
        .set({ remainingQuantity: () => `remainingQuantity + ${reservation.quantityReserved}`, version: () => 'version + 1' })
        .where('id = :id', { id: reservation.dealId })
        .execute()
      await queryRunner.commitTransaction()
      this.socketGateway.emitReservationExpired(reservation.id, reservation.dealId)
      const updatedDeal = await this.dealRepository.findOne({ where: { id: reservation.dealId } })
      this.socketGateway.emitDealQuantity(reservation.dealId, updatedDeal?.remainingQuantity ?? 0)
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }
}
