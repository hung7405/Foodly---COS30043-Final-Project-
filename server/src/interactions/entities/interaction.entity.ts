import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

export enum InteractionAction {
  VIEW = 'view',
  LIKE = 'like',
  UNLIKE = 'unlike',
  BOOKMARK = 'bookmark',
  UNBOOKMARK = 'unbookmark',
  RESERVE = 'reserve',
  SHARE = 'share',
}

@Entity()
@Index(['userId', 'dealId', 'action'])
export class UserInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ nullable: true })
  userId: string

  @Column()
  dealId: string

  @Column({ type: 'simple-enum', enum: InteractionAction })
  action: InteractionAction

  @Column('float', { default: 1 })
  weight: number

  @CreateDateColumn()
  createdAt: Date
}
