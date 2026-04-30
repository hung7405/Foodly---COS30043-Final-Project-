import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm'
import { Deal } from '../../deals/entities/deal.entity'

@Entity()
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ nullable: true })
  address: string

  @Column('decimal', { precision: 10, scale: 7 })
  latitude: number

  @Column('decimal', { precision: 10, scale: 7 })
  longitude: number

  @Column({ nullable: true })
  category: string

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  avgTrustScore: number

  @Column({ default: 0 })
  totalDeals: number

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => Deal, (d) => d.store)
  deals: Deal[]
}
