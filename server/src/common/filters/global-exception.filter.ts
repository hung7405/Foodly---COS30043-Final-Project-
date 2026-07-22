import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const message = exception instanceof HttpException ? exception.getResponse() : 'Internal server error'

    const errorMsg = `HTTP ${status} — ${typeof message === 'string' ? message : JSON.stringify(message)}`
    const stack = exception instanceof Error ? exception.stack : JSON.stringify(exception, null, 2)
    this.logger.error(errorMsg, stack)

    response.status(status).json({
      statusCode: status,
      message: typeof message === 'string' ? message : (message as any).message || message,
      timestamp: new Date().toISOString(),
    })
  }
}
