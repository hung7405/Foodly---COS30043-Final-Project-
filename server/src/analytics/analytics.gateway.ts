import { Logger } from '@nestjs/common'
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { AnalyticsService } from './analytics.service'
import { config } from '../config'

@WebSocketGateway(Number(process.env.ANALYTICS_PORT || 3001), {
  cors: { origin: config.corsOrigins, credentials: true },
  namespace: '/analytics',
})
export class AnalyticsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AnalyticsGateway.name)
  @WebSocketServer() server: Server
  private interval: ReturnType<typeof setInterval>

  constructor(private analyticsService: AnalyticsService) {}

  afterInit() {
    this.logger.log('Analytics gateway initialized')
    this.interval = setInterval(async () => {
      try {
        const metrics = await this.analyticsService.computeLiveMetrics()
        this.server.emit('analytics:tick', { timestamp: new Date(), metrics })
      } catch {
        // Push interval continues
      }
    }, 5000)
  }

  handleConnection(client: Socket) {
    this.logger.log(`Analytics client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Analytics client disconnected: ${client.id}`)
  }
}
