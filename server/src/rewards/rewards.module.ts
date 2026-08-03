import { Module } from '@nestjs/common'
import { RewardsController } from './rewards.controller'
import { RewardsService } from './rewards.service'
import { SocketModule } from '../socket/socket.module'

@Module({
  imports: [SocketModule],
  controllers: [RewardsController],
  providers: [RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}
