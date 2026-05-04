import { Logger } from '@nestjs/common'
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { config } from '../config'

@WebSocketGateway({
  cors: { origin: config.corsOrigins, credentials: true },
  namespace: '/',
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SocketGateway.name)
  @WebSocketServer() server: Server

  afterInit() {
    this.logger.log('Socket.IO gateway initialized')
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`)

    // Verify token
    const token = client.handshake.auth?.token
    if (!token) {
      client.emit('error', { message: 'Authentication required' })
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  @SubscribeMessage('deal:join')
  handleDealJoin(client: Socket, dealId: string) {
    client.join(`deal:${dealId}`)
  }

  @SubscribeMessage('deal:leave')
  handleDealLeave(client: Socket, dealId: string) {
    client.leave(`deal:${dealId}`)
  }

  @SubscribeMessage('map:viewport')
  handleMapViewport(client: Socket, bounds: { sw_lat: number; sw_lng: number; ne_lat: number; ne_lng: number }) {
    const roomName = `map:${this.hashBounds(bounds)}`
    client.join(roomName)
  }

  @SubscribeMessage('map:leave')
  handleMapLeave(client: Socket) {
    // Remove from all map rooms
    client.rooms.forEach((room) => {
      if (room.startsWith('map:')) {
        client.leave(room)
      }
    })
  }

  @SubscribeMessage('feed:join')
  handleFeedJoin(client: Socket) {
    client.join('feed:global')
  }

  @SubscribeMessage('feed:leave')
  handleFeedLeave(client: Socket) {
    client.leave('feed:global')
  }

  @SubscribeMessage('dashboard:join')
  handleDashboardJoin(client: Socket) {
    client.join('dashboard:admin')
  }

  @SubscribeMessage('dashboard:leave')
  handleDashboardLeave(client: Socket) {
    client.leave('dashboard:admin')
  }

  // Emitter methods — called by services
  emitDealCreated(deal: any) {
    this.server.emit('deal:created', deal)
  }

  emitDealUpdated(dealId: string, changes: any) {
    this.server.to(`deal:${dealId}`).emit('deal:updated', { id: dealId, changes })
  }

  emitDealQuantity(dealId: string, remaining: number) {
    this.server.to(`deal:${dealId}`).emit('deal:quantity', { id: dealId, remaining })
  }

  emitDealVerified(dealId: string, verifiedBy: string) {
    this.server.emit('deal:verified', { id: dealId, verifiedBy })
  }

  emitReservationCreated(reservation: any) {
    this.server.to(`deal:${reservation.dealId}`).emit('reservation:created', reservation)
    this.server.to(`feed:global`).emit('feed:activity', {
      type: 'reservation',
      message: 'New reservation made',
      dealId: reservation.dealId,
    })
  }

  emitReservationExpired(reservationId: string, dealId: string) {
    this.server.to(`deal:${dealId}`).emit('reservation:expired', { id: reservationId, dealId })
  }

  emitCommentAdded(comment: any) {
    this.server.to(`deal:${comment.dealId}`).emit('comment:added', comment)
  }

  emitFeedActivity(activity: any) {
    this.server.to('feed:global').emit('feed:activity', activity)
  }

  private hashBounds(bounds: { sw_lat: number; sw_lng: number; ne_lat: number; ne_lng: number }): string {
    return `${Math.round(bounds.sw_lat * 10)},${Math.round(bounds.sw_lng * 10)},${Math.round(bounds.ne_lat * 10)},${Math.round(bounds.ne_lng * 10)}`
  }
}
