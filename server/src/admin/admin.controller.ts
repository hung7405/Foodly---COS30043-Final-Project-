import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { AdminService } from './admin.service'

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard()
  }

  @Get('deals/review')
  getReviewDeals() {
    return this.adminService.getReviewDeals()
  }

  @Put('users/:id/ban')
  banUser(@Param('id') id: string) {
    return this.adminService.banUser(id)
  }

  @Put('users/:id/role')
  changeRole(@Param('id') id: string, @Body('role') role: string) {
    return this.adminService.changeUserRole(id, role)
  }
}
