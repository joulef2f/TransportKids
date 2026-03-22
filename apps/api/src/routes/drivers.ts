import { Router } from 'express'
import { z } from 'zod'
import { eq, and, gte, lte } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../lib/db'
import { drivers, tours } from '../db/schema'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const driverSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  licenseNum: z.string().min(1),
  licenseExpiry: z.string().optional().nullable(),
  hourlyRate: z.number().positive(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

router.get('/', async (req: AuthRequest, res) => {
  const result = await db.query.drivers.findMany({
    where: (d, { eq }) => eq(d.companyId, req.user!.companyId),
  })
  res.json(result)
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = driverSchema.parse(req.body)
    const [driver] = await db.insert(drivers).values({
      id: createId(),
      ...data,
      companyId: req.user!.companyId,
      licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : null,
    }).returning()
    res.status(201).json(driver)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req: AuthRequest, res) => {
  const driver = await db.query.drivers.findFirst({
    where: (d, { and, eq }) => and(eq(d.id, req.params.id), eq(d.companyId, req.user!.companyId)),
  })
  if (!driver) return res.status(404).json({ error: 'Not found' })
  res.json(driver)
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const data = driverSchema.partial().parse(req.body)
    const updated = await db.update(drivers)
      .set({
        ...data,
        licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : data.licenseExpiry === null ? null : undefined,
      })
      .where(and(eq(drivers.id, req.params.id), eq(drivers.companyId, req.user!.companyId)))
      .returning()
    if (!updated.length) return res.status(404).json({ error: 'Not found' })
    res.json(updated[0])
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  const result = await db.delete(drivers)
    .where(and(eq(drivers.id, req.params.id), eq(drivers.companyId, req.user!.companyId)))
    .returning({ id: drivers.id })
  if (!result.length) return res.status(404).json({ error: 'Not found' })
  res.status(204).send()
})

router.get('/:id/schedule', async (req: AuthRequest, res) => {
  const { from, to } = req.query as { from: string; to: string }

  const driver = await db.query.drivers.findFirst({
    where: (d, { and, eq }) => and(eq(d.id, req.params.id), eq(d.companyId, req.user!.companyId)),
  })
  if (!driver) return res.status(404).json({ error: 'Not found' })

  const result = await db.query.tours.findMany({
    where: (t, { and, eq, gte, lte }) => and(
      eq(t.driverId, req.params.id),
      eq(t.companyId, req.user!.companyId),
      from ? gte(t.date, new Date(from)) : undefined,
      to ? lte(t.date, new Date(to)) : undefined,
    ),
    with: {
      vehicle: true,
      stops: {
        orderBy: (s, { asc }) => [asc(s.sequenceOrder)],
        with: { child: true },
      },
    },
    orderBy: (t, { asc }) => [asc(t.date)],
  })

  res.json(result)
})

export default router
