import { Router } from 'express'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../lib/db'
import { vehicles } from '../db/schema'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const vehicleSchema = z.object({
  plate: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  capacity: z.number().int().positive(),
  fuelType: z.enum(['DIESEL', 'PETROL', 'ELECTRIC', 'HYBRID']),
  consumptionL100: z.number().positive(),
  kmTotal: z.number().int().default(0),
  nextServiceKm: z.number().int().optional().nullable(),
  insuranceExpiry: z.string().optional().nullable(),
  controlExpiry: z.string().optional().nullable(),
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE']).default('AVAILABLE'),
})

router.get('/', async (req: AuthRequest, res) => {
  const result = await db.query.vehicles.findMany({
    where: (v, { eq }) => eq(v.companyId, req.user!.companyId),
  })
  res.json(result)
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = vehicleSchema.parse(req.body)
    const [vehicle] = await db.insert(vehicles).values({
      id: createId(),
      ...data,
      companyId: req.user!.companyId,
      insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : null,
      controlExpiry: data.controlExpiry ? new Date(data.controlExpiry) : null,
    }).returning()
    res.status(201).json(vehicle)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req: AuthRequest, res) => {
  const vehicle = await db.query.vehicles.findFirst({
    where: (v, { and, eq }) => and(eq(v.id, req.params.id), eq(v.companyId, req.user!.companyId)),
  })
  if (!vehicle) return res.status(404).json({ error: 'Not found' })
  res.json(vehicle)
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const data = vehicleSchema.partial().parse(req.body)
    const updated = await db.update(vehicles)
      .set({
        ...data,
        insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : data.insuranceExpiry === null ? null : undefined,
        controlExpiry: data.controlExpiry ? new Date(data.controlExpiry) : data.controlExpiry === null ? null : undefined,
      })
      .where(and(eq(vehicles.id, req.params.id), eq(vehicles.companyId, req.user!.companyId)))
      .returning()
    if (!updated.length) return res.status(404).json({ error: 'Not found' })
    res.json(updated[0])
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  const result = await db.delete(vehicles)
    .where(and(eq(vehicles.id, req.params.id), eq(vehicles.companyId, req.user!.companyId)))
    .returning({ id: vehicles.id })
  if (!result.length) return res.status(404).json({ error: 'Not found' })
  res.status(204).send()
})

router.get('/:id/alerts', async (req: AuthRequest, res) => {
  const vehicle = await db.query.vehicles.findFirst({
    where: (v, { and, eq }) => and(eq(v.id, req.params.id), eq(v.companyId, req.user!.companyId)),
  })
  if (!vehicle) return res.status(404).json({ error: 'Not found' })

  const alerts: { type: string; message: string; severity: string }[] = []
  const now = new Date()
  const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  if (vehicle.nextServiceKm && vehicle.kmTotal >= vehicle.nextServiceKm - 500) {
    alerts.push({ type: 'maintenance', message: `Entretien requis dans ${vehicle.nextServiceKm - vehicle.kmTotal} km`, severity: 'warning' })
  }
  if (vehicle.insuranceExpiry && vehicle.insuranceExpiry <= in30days) {
    alerts.push({ type: 'insurance', message: `Assurance expire le ${vehicle.insuranceExpiry.toLocaleDateString('fr-FR')}`, severity: vehicle.insuranceExpiry <= now ? 'critical' : 'warning' })
  }
  if (vehicle.controlExpiry && vehicle.controlExpiry <= in30days) {
    alerts.push({ type: 'control', message: `Contrôle technique expire le ${vehicle.controlExpiry.toLocaleDateString('fr-FR')}`, severity: vehicle.controlExpiry <= now ? 'critical' : 'warning' })
  }

  res.json(alerts)
})

export default router
