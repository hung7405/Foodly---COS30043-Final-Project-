import { Controller, Post, Get, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { EmbeddingService } from './embedding.service'

@Controller('ai/embeddings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EmbeddingController {
  constructor(private embeddingService: EmbeddingService) {}

  @Get('status')
  @Roles('admin', 'moderator')
  async status() {
    return { enabled: this.embeddingService.isEnabled }
  }

  @Post('backfill')
  @Roles('admin')
  async backfill() {
    return this.embeddingService.backfill()
  }
}
