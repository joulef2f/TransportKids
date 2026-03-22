import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../lib/db'
import { users, companies } from '../db/schema'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt'

const router = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(1),
})

router.post('/register', async (req, res) => {
  try {
    const { email, password, companyName } = registerSchema.parse(req.body)

    const existing = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, email) })
    if (existing) return res.status(409).json({ error: 'Email already in use' })

    const [company] = await db.insert(companies).values({
      id: createId(),
      name: companyName,
      costSettings: {
        fuelPricePerLiter: 1.85,
        chargeRate: 45,
        maintenanceCostPerKm: 0.08,
        fixedMonthlyFees: 2000,
      },
    }).returning()

    const passwordHash = await bcrypt.hash(password, 10)
    const [user] = await db.insert(users).values({
      id: createId(),
      email,
      passwordHash,
      companyId: company.id,
    }).returning()

    const accessToken = signAccessToken({ userId: user.id, companyId: company.id, role: user.role })
    const refreshToken = signRefreshToken({ userId: user.id })

    return res.status(201).json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    console.error('REGISTER ERROR:', err)
    return res.status(500).json({ error: 'Internal server error', detail: err?.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body)

    const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, email) })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const accessToken = signAccessToken({ userId: user.id, companyId: user.companyId, role: user.role })
    const refreshToken = signRefreshToken({ userId: user.id })

    return res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    console.error('LOGIN ERROR:', err)
    return res.status(500).json({ error: 'Internal server error', detail: err?.message })
  }
})

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body)
    const payload = verifyRefreshToken(refreshToken)

    const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, payload.userId) })
    if (!user) return res.status(401).json({ error: 'User not found' })

    const accessToken = signAccessToken({ userId: user.id, companyId: user.companyId, role: user.role })
    return res.json({ accessToken })
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' })
  }
})

export default router
