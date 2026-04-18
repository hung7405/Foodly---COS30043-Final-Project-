import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './entities/user.entity'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findById(id: string) {
    const user = await this.userRepository.findOne({ where: { id } })
    if (!user) throw new NotFoundException('User not found')
    return this.sanitizeUser(user)
  }

  async findAll(page = 1, limit = 20) {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    })
    return { users: users.map(user => this.sanitizeUser(user)), total, page, totalPages: Math.ceil(total / limit) }
  }

  async updateRole(id: string, role: string) {
    if (!['guest', 'user', 'moderator', 'admin'].includes(role)) throw new BadRequestException('Invalid role')
    const user = await this.userRepository.findOne({ where: { id } })
    if (!user) throw new NotFoundException('User not found')
    user.role = role as any
    return this.sanitizeUser(await this.userRepository.save(user))
  }

  async toggleBan(id: string) {
    const user = await this.userRepository.findOne({ where: { id } })
    if (!user) throw new NotFoundException('User not found')
    user.isActive = !user.isActive
    return this.sanitizeUser(await this.userRepository.save(user))
  }

  private sanitizeUser(user: User) {
    const { passwordHash, ...safeUser } = user
    return safeUser
  }
}
