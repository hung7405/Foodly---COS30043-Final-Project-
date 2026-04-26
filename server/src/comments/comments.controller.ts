import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { CommentsService } from './comments.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { User } from '../users/entities/user.entity'

@Controller()
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get('deals/:dealId/comments')
  findByDeal(@Param('dealId') dealId: string) {
    return this.commentsService.findByDeal(dealId)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('deals/:dealId/comments')
  create(@Param('dealId') dealId: string, @Body('content') content: string, @Body('parentId') parentId: string, @CurrentUser() user: User) {
    return this.commentsService.create(dealId, user.id, content, parentId)
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('comments/:id')
  update(@Param('id') id: string, @Body('content') content: string, @CurrentUser() user: User) {
    return this.commentsService.update(id, content, user.id)
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('comments/:id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.commentsService.remove(id, user.id, user.role)
  }
}
