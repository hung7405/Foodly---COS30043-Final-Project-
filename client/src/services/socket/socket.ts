import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null
let analyticsSocket: Socket | null = null

function pickUrl(raw: string | undefined, fallback: string): string {
  const value = (raw || '').trim()
  if (/^https?:\/\//i.test(value) && !/^vite_/i.test(value)) {
    const host = value.replace(/^https?:\/\//i, '').split(/[/:]/)[0].toLowerCase()
    if (!import.meta.env.PROD || (host !== 'localhost' && host !== '127.0.0.1')) return value
  }
  return fallback
}

const DEFAULT_SOCKET_URL = import.meta.env.PROD
  ? 'https://foodly-cos30043-final-project.onrender.com'
  : 'http://localhost:3000'

const DEFAULT_ANALYTICS_URL = import.meta.env.PROD
  ? 'https://foodly-cos30043-final-project.onrender.com/analytics'
  : 'http://localhost:3000/analytics'

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
    socket = io(pickUrl(import.meta.env.VITE_SOCKET_URL, DEFAULT_SOCKET_URL), makeOptions())
  }
  return socket
}

export function getAnalyticsSocket(): Socket {
  if (!analyticsSocket) {
    analyticsSocket = io(
      pickUrl(import.meta.env.VITE_ANALYTICS_SOCKET_URL, DEFAULT_ANALYTICS_URL),
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
