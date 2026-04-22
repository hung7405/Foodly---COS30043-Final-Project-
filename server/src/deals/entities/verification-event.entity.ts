import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Deal } from './deal.entity'
import { User } from '../../users/entities/user.entity'

export enum VerificationAction {
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
}

@Entity()
export class VerificationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  dealId: string

  @ManyToOne(() => Deal, (d) => d.verificationEvents)
  @JoinColumn({ name: 'dealId' })
  deal: Deal

  @Column()
  moderatorId: string

  @ManyToOne(() => User, (u) => u.verifications)
  @JoinColumn({ name: 'moderatorId' })
  moderator: User

  @Column({ type: 'simple-enum', enum: VerificationAction })
  action: VerificationAction

  @Column('text', { nullable: true })
  notes: string

  @CreateDateColumn()
  createdAt: Date
}
