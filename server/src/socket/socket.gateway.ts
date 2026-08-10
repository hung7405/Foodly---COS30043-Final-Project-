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
import * as jwt from 'jsonwebtoken'
import { config, corsOrigin } from '../config'

interface SocketUser {
  id: string
  email: string
  role: string
}

@WebSocketGateway({
  cors: { origin: corsOrigin, credentials: true },
  namespace: '/',
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SocketGateway.name)
  @WebSocketServer() server: Server

  afterInit() {
    this.logger.log('Socket.IO gateway initialized')
  }

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token
    const user = this.verifyToken(token)
    if (token && !user) {
      // A token was supplied but is invalid/expired — do not trust it.
      client.emit('error', { message: 'Authentication required' })
      client.disconnect(true)
      return
    }
    client.data.user = user
    if (user) {
      client.join(`user:${user.id}`)
      this.logger.log(`Client connected: ${client.id} (${user.email}, ${user.role})`)
    } else {
      this.logger.log(`Client connected (anonymous): ${client.id}`)
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  private verifyToken(token: unknown): SocketUser | null {
    if (typeof token !== 'string' || !token) return null
    try {
      const payload = jwt.verify(token, config.jwtSecret) as SocketUser
      if (!payload?.id) return null
      return payload
    } catch {
      return null
    }
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
    if (client.data.user?.role !== 'admin') {
      client.emit('error', { message: 'Forbidden' })
      return
    }
    client.join('dashboard:admin')
  }

  @SubscribeMessage('dashboard:leave')
  handleDashboardLeave(client: Socket) {
    client.leave('dashboard:admin')
  }

  // Emitter methods — called by services
  emitDealCreated(deal: any) {
    this.server.emit('deal:created', deal)
    this.server.to('feed:global').emit('feed:activity', {
      type: 'deal',
      message: 'posted a new deal',
      user: deal?.user?.username || deal?.user?.firstName || 'Community Member',
      dealId: deal?.id,
    })
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
    const dealId = reservation.deal_id || reservation.dealId
    // Never broadcast the reservation code to other users in the room.
    const publicReservation = { ...reservation }
    delete publicReservation.reservation_code
    this.server.to(`deal:${dealId}`).emit('reservation:created', publicReservation)
    this.server.to(`feed:global`).emit('feed:activity', {
      type: 'reservation',
      message: 'New reservation made',
      dealId: dealId,
    })
    // The owner of the reservation still needs their code.
    if (reservation.user_id) {
      this.server.to(`user:${reservation.user_id}`).emit('reservation:created:own', reservation)
    }
  }

  emitReservationConfirmed(reservationId: string) {
    this.server.emit('reservation:confirmed', { id: reservationId })
  }

  emitReservationExpired(reservationId: string, dealId: string) {
    this.server.to(`deal:${dealId}`).emit('reservation:expired', { id: reservationId, dealId })
  }

  emitCommentAdded(comment: any) {
    const dealId = comment.deal_id || comment.dealId
    this.server.to(`deal:${dealId}`).emit('comment:added', comment)
  }

  emitFeedActivity(activity: any) {
    this.server.to('feed:global').emit('feed:activity', activity)
  }

  private hashBounds(bounds: { sw_lat: number; sw_lng: number; ne_lat: number; ne_lng: number }): string {
    return `${Math.round(bounds.sw_lat * 10)},${Math.round(bounds.sw_lng * 10)},${Math.round(bounds.ne_lat * 10)},${Math.round(bounds.ne_lng * 10)}`
  }
}
