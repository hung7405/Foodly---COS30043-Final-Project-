import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity()
export class ActivityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  userId: string

  @Column({ nullable: true })
  dealId: string

  @Column()
  eventType: string

  @Column('jsonb', { nullable: true })
  metadata: any

  @CreateDateColumn()
  createdAt: Date
}

@Entity()
export class AnalyticsSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ default: 0 })
  activeUsers: number

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  reservationsPerMinute: number

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  dealsPerMinute: number

  @Column({ default: 0 })
  verificationsTotal: number

  @Column({ default: 0 })
  commentsTotal: number

  @CreateDateColumn()
  capturedAt: Date
}
