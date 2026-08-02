import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null
let analyticsSocket: Socket | null = null

function currentToken(): string | null {
  return localStorage.getItem('token')
}

function makeOptions() {
  return {
    auth: { token: currentToken() },
    transports: ['websocket', 'polling'] as string[],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  }
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', makeOptions())
  }
  return socket
}

export function getAnalyticsSocket(): Socket {
  if (!analyticsSocket) {
    analyticsSocket = io(
      import.meta.env.VITE_ANALYTICS_SOCKET_URL || 'http://localhost:3001/analytics',
      makeOptions(),
    )
  }
  return analyticsSocket
}

/**
 * Refresh the auth token on an existing live connection (called after
 * login/logout) without dropping the socket. Falls back to a fresh connect
 * if the current socket is not connected.
 */
export function refreshSocketAuth() {
  if (!socket) return
  if (socket.connected) {
    socket.auth = { token: currentToken() }
    socket.disconnect()
    socket.connect()
  } else {
    socket.auth = { token: currentToken() }
  }
  if (analyticsSocket) {
    analyticsSocket.auth = { token: currentToken() }
  }
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
