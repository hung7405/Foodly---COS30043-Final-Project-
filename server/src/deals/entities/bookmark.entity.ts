import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm'
import { User } from '../../users/entities/user.entity'

@Entity()
@Unique(['userId', 'dealId'])
export class Bookmark {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  userId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  @Column()
  dealId: string

  @CreateDateColumn()
  createdAt: Date
}
