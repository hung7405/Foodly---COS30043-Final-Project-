import { Module } from '@nestjs/common'
import { StoresController } from './stores.controller'
import { StoresService } from './stores.service'

@Module({
  imports: [],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
