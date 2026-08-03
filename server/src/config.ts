function required(name: string): string {
  const v = process.env[name]
  if (!v && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return v || ''
}

type CorsCallback = (err: Error | null, allow?: boolean | string) => void

// Authentication on this API uses an Authorization (Bearer) header and NEVER
// cookies, so a browser cannot exploit a permissive CORS policy to steal a
// victim's token (the token is not auto-attached to cross-origin requests).
// We therefore REFLECT the request Origin for every browser origin — this is
// robust against shifting Vercel preview URLs (regenerated on each deploy),
// the Mercury subpath origin, and localhost dev, with zero per-deploy env edits.
// The reflected value is the specific Origin string (never '*'), so
// Allow-Credentials stays valid. This single handler is shared by the REST
// layer (app.enableCors) and both WebSocket gateways (socket.io cors).
export const corsOrigin = (origin: string | undefined, callback: CorsCallback): void => {
  if (!origin) return callback(null, false) // no Origin header => same-origin / server-to-server / non-browser
  return callback(null, origin) // reflect the request origin
}

export const config = {
  jwtSecret: required('JWT_SECRET') || 'test-secret-for-dev',
  isProduction: process.env.NODE_ENV === 'production',
}
