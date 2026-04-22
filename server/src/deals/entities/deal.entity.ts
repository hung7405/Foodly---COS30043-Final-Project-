import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm'
import { User } from '../../users/entities/user.entity'
import { Store } from '../../stores/entities/store.entity'
import { Reservation } from '../../reservations/entities/reservation.entity'
import { Comment } from '../../comments/entities/comment.entity'
import { VerificationEvent } from './verification-event.entity'

export enum DealStatus {
  ACTIVE = 'active',
  RESERVED = 'reserved',
  EXPIRED = 'expired',
  REMOVED = 'removed',
}

@Entity()
export class Deal {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  userId: string

  @ManyToOne(() => User, (user) => user.deals)
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ nullable: true })
  storeId: string

  @ManyToOne(() => Store, (store) => store.deals)
  @JoinColumn({ name: 'storeId' })
  store: Store

  @Column({ length: 200 })
  title: string

  @Column('text', { nullable: true })
  description: string

  @Column('decimal', { precision: 10, scale: 2 })
  originalPrice: number

  @Column('decimal', { precision: 10, scale: 2 })
  discountPrice: number

  @Column({ length: 3, default: 'VND' })
  currency: string

  @Column({ default: 1 })
  remainingQuantity: number

  @Column()
  originalQuantity: number

  @Column({ type: 'simple-enum', enum: DealStatus, default: DealStatus.ACTIVE })
  status: DealStatus

  @Column({ default: false })
  verified: boolean

  @Column({ nullable: true })
  verifiedById: string

  @Column('decimal', { precision: 10, scale: 7 })
  latitude: number

  @Column('decimal', { precision: 10, scale: 7 })
  longitude: number

  @Column({ nullable: true })
  address: string

  @Column('simple-json', { default: '[]' })
  images: string[]

  @Column()
  expiresAt: Date

  @Column('simple-json', { default: '[]' })
  tags: string[]

  @Column({ default: 1 })
  version: number

  @Column({ default: 0 })
  likeCount: number

  @Column({ default: 0 })
  bookmarkCount: number

  @Column({ default: 0 })
  commentCount: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => Reservation, (r) => r.deal)
  reservations: Reservation[]

  @OneToMany(() => Comment, (c) => c.deal)
  comments: Comment[]

  @OneToMany(() => VerificationEvent, (v) => v.deal)
  verificationEvents: VerificationEvent[]
}
