function required(name: string): string {
  const v = process.env[name]
  if (!v && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return v || ''
}

export const config = {
  jwtSecret: required('JWT_SECRET') || 'test-secret-for-dev',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s => s.trim()).filter(Boolean),
  isProduction: process.env.NODE_ENV === 'production',
}

