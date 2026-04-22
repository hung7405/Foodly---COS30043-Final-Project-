import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { DealsService } from './deals.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { User } from '../users/entities/user.entity'
import { CreateDealDto } from './dto/create-deal.dto'
import { UpdateDealDto } from './dto/update-deal.dto'

@Controller('deals')
export class DealsController {
  constructor(private dealsService: DealsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.dealsService.findAll(query)
  }

  @Get('map')
  findMapDeals(@Query() query: any) {
    return this.dealsService.findMapDeals(
      parseFloat(query.swLat), parseFloat(query.swLng),
      parseFloat(query.neLat), parseFloat(query.neLng),
      query.status,
    )
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('mine')
  findMine(@CurrentUser() user: User) {
    return this.dealsService.findMine(user.id)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dealsService.findById(id)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() dto: CreateDealDto, @CurrentUser() user: User) {
    return this.dealsService.create(dto as any, user.id)
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDealDto, @CurrentUser() user: User) {
    return this.dealsService.update(id, dto as any, user.id, user.role)
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.dealsService.remove(id, user.id, user.role)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('moderator', 'admin')
  @Post(':id/verify')
  verify(@Param('id') id: string, @Body('action') action: string, @Body('notes') notes: string, @CurrentUser() user: User) {
    return this.dealsService.verify(id, user.id, action as any, notes)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/like')
  toggleLike(@Param('id') id: string, @CurrentUser() user: User) {
    return this.dealsService.toggleLike(id, user.id)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/bookmark')
  toggleBookmark(@Param('id') id: string, @CurrentUser() user: User) {
    return this.dealsService.toggleBookmark(id, user.id)
  }
}
