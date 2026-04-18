import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { User } from '../users/entities/user.entity'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(email: string, username: string, password: string, firstName?: string, lastName?: string) {
    const existing = await this.userRepository.findOne({ where: [{ email }, { username }] })
    if (existing) {
      throw new ConflictException('Email or username already exists')
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = this.userRepository.create({
      email,
      username,
      passwordHash,
      firstName,
      lastName,
    })
    await this.userRepository.save(user)

    const token = this.jwtService.sign({ id: user.id, email: user.email, role: user.role })
    return { user: this.sanitizeUser(user), token }
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findOne({ where: { email } })
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) throw new UnauthorizedException('Invalid credentials')

    user.lastLogin = new Date()
    await this.userRepository.save(user)

    const token = this.jwtService.sign({ id: user.id, email: user.email, role: user.role })
    return { user: this.sanitizeUser(user), token }
  }

  async getProfile(id: string) {
    const user = await this.userRepository.findOne({ where: { id } })
    if (!user) throw new UnauthorizedException('User not found')
    return this.sanitizeUser(user)
  }

  async updateProfile(id: string, data: Partial<User>) {
    await this.userRepository.update(id, data)
    return this.getProfile(id)
  }

  private sanitizeUser(user: User) {
    const { passwordHash, ...rest } = user
    return rest
  }
}
