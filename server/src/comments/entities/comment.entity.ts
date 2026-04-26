import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm'
import { Deal } from '../../deals/entities/deal.entity'
import { User } from '../../users/entities/user.entity'

export enum CommentStatus {
  ACTIVE = 'active',
  HIDDEN = 'hidden',
  FLAGGED = 'flagged',
}

@Entity()
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  dealId: string

  @ManyToOne(() => Deal, (d) => d.comments)
  @JoinColumn({ name: 'dealId' })
  deal: Deal

  @Column()
  userId: string

  @ManyToOne(() => User, (u) => u.comments)
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ nullable: true })
  parentId: string

  @ManyToOne(() => Comment, (c) => c.replies)
  @JoinColumn({ name: 'parentId' })
  parent: Comment

  @OneToMany(() => Comment, (c) => c.parent)
  replies: Comment[]

  @Column('text')
  content: string

  @Column({ default: 0 })
  likeCount: number

  @Column({ type: 'simple-enum', enum: CommentStatus, default: CommentStatus.ACTIVE })
  status: CommentStatus

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
