import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Deal } from '../../deals/entities/deal.entity'
import { User } from '../../users/entities/user.entity'

export enum ReservationStatus {
  ACTIVE = 'active',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity()
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  dealId: string

  @ManyToOne(() => Deal, (d) => d.reservations)
  @JoinColumn({ name: 'dealId' })
  deal: Deal

  @Column()
  userId: string

  @ManyToOne(() => User, (u) => u.reservations)
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ type: 'simple-enum', enum: ReservationStatus, default: ReservationStatus.ACTIVE })
  status: ReservationStatus

  @CreateDateColumn()
  reservedAt: Date

  @Column()
  expiresAt: Date

  @Column({ nullable: true })
  confirmedAt: Date

  @Column({ length: 20, unique: true, nullable: true })
  reservationCode: string

  @Column({ default: 1 })
  quantityReserved: number
}
