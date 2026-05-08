import { Controller, Post, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '@nestjs/passport'
import { AiService } from './ai.service'

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('search')
  @UseInterceptors(FileInterceptor('image'))
  async search(@UploadedFile() file: any) {
    if (!file) return { error: 'No image provided' }
    return this.aiService.searchByImage(file.buffer, file.originalname)
  }
}
