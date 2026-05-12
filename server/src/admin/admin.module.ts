import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { UsersModule } from '../users/users.module'
import { DealsModule } from '../deals/deals.module'

@Module({
  imports: [UsersModule, DealsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
