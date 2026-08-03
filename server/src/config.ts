function required(name: string): string {
  const v = process.env[name]
  if (!v && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return v || ''
}

const explicit = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
const isProduction = process.env.NODE_ENV === 'production'

export const config = {
  jwtSecret: required('JWT_SECRET') || 'test-secret-for-dev',
  // Strict allowlist when CORS_ORIGINS is set. When it is NOT set we leave the
  // list empty and let main.ts reflect the request Origin for every origin
  // (see enableCors). Safe because auth uses an Authorization header, never
  // cookies, so a permissive CORS policy cannot steal a victim's token.
  corsOrigins: explicit.length ? explicit : [],
  isProduction,
}

