import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret'

export function signAccessToken(payload: { userId: string; companyId: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
}

export function signRefreshToken(payload: { userId: string }) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' })
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { userId: string; companyId: string; role: string }
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string }
}
