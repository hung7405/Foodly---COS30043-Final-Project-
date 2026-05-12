import { Injectable } from '@nestjs/common'
import { UsersService } from '../users/users.service'
import { DealsService } from '../deals/deals.service'

@Injectable()
export class AdminService {
  constructor(
    private usersService: UsersService,
    private dealsService: DealsService,
  ) {}

  async getDashboard() {
    const { users } = await this.usersService.findAll(1, 10000)
    const { deals } = await this.dealsService.findAll({ page: 1, limit: 10000 })
    return {
      totalUsers: users.length,
      totalDeals: deals.length,
      activeDeals: deals.filter(d => d.status === 'active').length,
    }
  }

  async getReviewDeals() {
    return this.dealsService.findAll({ page: 1, limit: 100, sort: 'createdAt', order: 'DESC' })
  }

  async banUser(id: string) {
    return this.usersService.toggleBan(id)
  }

  async changeUserRole(id: string, role: string) {
    return this.usersService.updateRole(id, role)
  }
}
