import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user
    const resourceUserId = request.params.userId || request.body?.userId

    if (!user) throw new UnauthorizedException()

    if (user.role === 'admin') return true

    if (resourceUserId && resourceUserId !== user.id) {
      throw new UnauthorizedException('You can only modify your own resources')
    }

    return true
  }
}
