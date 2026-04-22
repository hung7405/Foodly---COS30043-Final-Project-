import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm'
import { User } from '../../users/entities/user.entity'

@Entity()
@Unique(['userId', 'targetId', 'targetType'])
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  userId: string

  @Column()
  targetId: string

  @Column()
  targetType: string

  @Column({ default: 'like' })
  type: string

  @CreateDateColumn()
  createdAt: Date
}
