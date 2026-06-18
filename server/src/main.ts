require('dotenv').config()
import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { AppModule } from './app.module'
import helmet from 'helmet'
import { config } from './config'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule, { logger: ['log', 'error', 'warn', 'debug', 'verbose'] })

  app.use(helmet())
  app.useGlobalFilters(new GlobalExceptionFilter())

  const port = Number(process.env.PORT || 3000)

  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.setGlobalPrefix('api')

  await app.listen(port)
  logger.log(`Foodly API running on http://localhost:${port}`)

  const signals = ['SIGTERM', 'SIGINT']
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.log(`Received ${signal}, shutting down gracefully...`)
      await app.close()
      process.exit(0)
    })
  }
}

bootstrap()
