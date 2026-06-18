import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { DealsModule } from './deals/deals.module'
import { ReservationsModule } from './reservations/reservations.module'
import { CommentsModule } from './comments/comments.module'
import { StoresModule } from './stores/stores.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { AdminModule } from './admin/admin.module'
import { SocketModule } from './socket/socket.module'
import { AiModule } from './ai/ai.module'
import { HealthModule } from './health/health.module'
import { NewsModule } from './news/news.module'
import { RecommendationModule } from './recommendation/recommendation.module'

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRoot(process.env.DATABASE_URL
      ? {
          type: 'postgres',
          url: process.env.DATABASE_URL,
          autoLoadEntities: true,
          synchronize: process.env.TYPEORM_SYNC !== 'false',
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        }
      : {
          type: 'better-sqlite3',
          database: process.env.DATABASE_PATH || './data/foodly.db',
          autoLoadEntities: true,
          synchronize: process.env.TYPEORM_SYNC !== 'false',
          extra: { enableWAL: true },
        }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    DealsModule,
    ReservationsModule,
    CommentsModule,
    StoresModule,
    AnalyticsModule,
    AdminModule,
    SocketModule,
    AiModule,
    NewsModule,
    RecommendationModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
