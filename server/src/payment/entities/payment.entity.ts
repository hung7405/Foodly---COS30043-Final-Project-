import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from '../../users/entities/user.entity'
import { Reservation } from '../../reservations/entities/reservation.entity'

export enum PaymentProvider {
  MOMO = 'momo',
  VNPAY = 'vnpay',
  MOCK = 'mock',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  EXPIRED = 'expired',
}

@Entity()
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  userId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  @Column()
  reservationId: string

  @ManyToOne(() => Reservation)
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number

  @Column({ length: 3, default: 'VND' })
  currency: string

  @Column({ type: 'simple-enum', enum: PaymentProvider, default: PaymentProvider.MOCK })
  provider: PaymentProvider

  @Column({ type: 'simple-enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus

  @Column({ nullable: true })
  providerTransactionId: string

  @Column({ nullable: true })
  providerReferenceId: string

  @Column({ nullable: true })
  paymentUrl: string

  @Column({ nullable: true })
  qrCodeUrl: string

  @Column({ nullable: true })
  paidAt: Date

  @Column('simple-json', { nullable: true })
  providerResponse: any

  @Column({ nullable: true })
  failureReason: string

  @Column({ nullable: true })
  refundedAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
