import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { SupabaseModule } from './supabase/supabase.module'
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
import { PaymentModule } from './payment/payment.module'
import { GeoModule } from './geo/geo.module'
import { InteractionsModule } from './interactions/interactions.module'
import { EmbeddingModule } from './embedding/embedding.module'
import { MerchantModule } from './merchant/merchant.module'
import { RewardsModule } from './rewards/rewards.module'
import { SupportModule } from './support/support.module'
import { FeedModule } from './feed/feed.module'

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    SupabaseModule,
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
    PaymentModule,
    GeoModule,
    InteractionsModule,
    EmbeddingModule,
    MerchantModule,
    RewardsModule,
    SupportModule,
    FeedModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
