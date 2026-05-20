import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null
let analyticsSocket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export function getAnalyticsSocket(): Socket {
  if (!analyticsSocket) {
    analyticsSocket = io(import.meta.env.VITE_ANALYTICS_SOCKET_URL || 'http://localhost:3001/analytics', {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket', 'polling'],
    })
  }
  return analyticsSocket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  if (analyticsSocket) {
    analyticsSocket.disconnect()
    analyticsSocket = null
  }
}
