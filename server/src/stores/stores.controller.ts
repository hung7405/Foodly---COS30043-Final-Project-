import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { StoresService } from './stores.service'

@Controller('stores')
export class StoresController {
  constructor(private storesService: StoresService) {}

  @Get()
  findAll() {
    return this.storesService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.storesService.findById(id)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() data: any) {
    return this.storesService.create(data)
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.storesService.update(id, data)
  }
}
