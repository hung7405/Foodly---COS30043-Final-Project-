import { Controller, Get, Req } from '@nestjs/common'
import { Request } from 'express'

@Controller('geo')
export class GeoController {
  @Get()
  async locate(@Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1'
    try {
      const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon,query`)
      if (!res.ok) return { status: 'fail', lat: 10.8231, lon: 106.6297, city: 'Ho Chi Minh City' }
      return res.json()
    } catch {
      return { status: 'fail', lat: 10.8231, lon: 106.6297, city: 'Ho Chi Minh City' }
    }
  }
}
