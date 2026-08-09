import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm'
import { Deal } from '../../deals/entities/deal.entity'
import { Reservation } from '../../reservations/entities/reservation.entity'
import { Comment } from '../../comments/entities/comment.entity'
import { VerificationEvent } from '../../deals/entities/verification-event.entity'

export enum UserRole {
  GUEST = 'guest',
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  email: string

  @Column({ unique: true })
  username: string

  @Column()
  passwordHash: string

  @Column({ nullable: true })
  firstName: string

  @Column({ nullable: true })
  lastName: string

  @Column({ type: 'simple-enum', enum: UserRole, default: UserRole.USER })
  role: UserRole

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  trustScore: number

  @Column({ default: 0 })
  reputationPoints: number

  @Column({ nullable: true })
  avatarUrl: string

  @Column({ nullable: true })
  deliveryAddress: string

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ nullable: true })
  lastLogin: Date

  @OneToMany(() => Deal, (deal) => deal.user)
  deals: Deal[]

  @OneToMany(() => Reservation, (res) => res.user)
  reservations: Reservation[]

  @OneToMany(() => Comment, (c) => c.user)
  comments: Comment[]

  @OneToMany(() => VerificationEvent, (v) => v.moderator)
  verifications: VerificationEvent[]
}
