import { Controller, Get, Param, Query } from '@nestjs/common'
import { NewsService } from './news.service'

@Controller('news')
export class NewsController {
  constructor(private newsService: NewsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.newsService.findAll(query)
  }

  @Get('categories')
  getCategories() {
    return this.newsService.getCategories()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.newsService.findById(Number(id))
  }
}
