import { Controller, Post, Get, Put, Body, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { User } from '../users/entities/user.entity'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.username, dto.password, dto.firstName, dto.lastName, dto.role)
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password)
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user.id)
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('me')
  updateProfile(@CurrentUser() user: User, @Body() data: Partial<RegisterDto>) {
    return this.authService.updateProfile(user.id, data)
  }
}
