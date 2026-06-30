import { Module } from '@nestjs/common'
import { CommentsController } from './comments.controller'
import { CommentsService } from './comments.service'
import { SocketModule } from '../socket/socket.module'
import { AnalyticsModule } from '../analytics/analytics.module'

@Module({
  imports: [SocketModule, AnalyticsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
