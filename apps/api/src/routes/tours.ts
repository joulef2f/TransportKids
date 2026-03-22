import { Router } from 'express'
import { z } from 'zod'
import { eq, and, gte, lte, ne } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../lib/db'
import { tours, tourStops, tourCosts, companies } from '../db/schema'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const stopSchema = z.object({
  childId: z.string(),
  address: z.string().min(1),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  sequenceOrder: z.number().int(),
  scheduledTime: z.string().optional().nullable(),
})

const tourSchema = z.object({
  name: z.string().min(1),
  date: z.string(),
  driverId: z.string(),
  vehicleId: z.string(),
  type: z.enum(['ONE_WAY', 'ROUND_TRIP', 'MULTI']),
  billedPrice: z.number().optional().nullable(),
  recurrence: z.object({ type: z.string(), days: z.array(z.number()) }).optional().nullable(),
  startAddress: z.string().optional().nullable(),
  endAddress: z.string().optional().nullable(),
  stops: z.array(stopSchema).optional().default([]),
})

const tourWithRelations = {
  driver: true,
  vehicle: true,
  stops: {
    orderBy: (s: any, { asc }: any) => [asc(s.sequenceOrder)],
    with: { child: true },
  },
  cost: true,
} as const

async function checkConflicts(
  companyId: string,
  driverId: string,
  vehicleId: string,
  date: Date,
  excludeTourId?: string,
) {
  const dateStart = new Date(date)
  dateStart.setHours(0, 0, 0, 0)
  const dateEnd = new Date(date)
  dateEnd.setHours(23, 59, 59, 999)

  const baseConditions = (idField: 'driverId' | 'vehicleId', idValue: string) => {
    const conds = [
      eq(tours.companyId, companyId),
      idField === 'driverId' ? eq(tours.driverId, idValue) : eq(tours.vehicleId, idValue),
      gte(tours.date, dateStart),
      lte(tours.date, dateEnd),
      ne(tours.status, 'CANCELLED'),
    ]
    if (excludeTourId) conds.push(ne(tours.id, excludeTourId))
    return and(...conds)
  }

  const [driverConflicts, vehicleConflicts] = await Promise.all([
    db.select({ id: tours.id, name: tours.name }).from(tours).where(baseConditions('driverId', driverId)),
    db.select({ id: tours.id, name: tours.name }).from(tours).where(baseConditions('vehicleId', vehicleId)),
  ])

  const conflicts: { type: 'driver' | 'vehicle'; tourId: string; tourName: string }[] = []
  driverConflicts.forEach(t => conflicts.push({ type: 'driver', tourId: t.id, tourName: t.name }))
  vehicleConflicts.forEach(t => conflicts.push({ type: 'vehicle', tourId: t.id, tourName: t.name }))
  return conflicts
}

router.get('/', async (req: AuthRequest, res) => {
  const { from, to, driverId, vehicleId, status } = req.query as Record<string, string>
  const toDate = to ? new Date(to) : undefined
  if (toDate) toDate.setHours(23, 59, 59, 999)

  const result = await db.query.tours.findMany({
    where: (t, { and, eq, gte, lte }) => and(
      eq(t.companyId, req.user!.companyId),
      from ? gte(t.date, new Date(from)) : undefined,
      toDate ? lte(t.date, toDate) : undefined,
      driverId ? eq(t.driverId, driverId) : undefined,
      vehicleId ? eq(t.vehicleId, vehicleId) : undefined,
      status ? eq(t.status, status as any) : undefined,
    ),
    with: tourWithRelations,
    orderBy: (t, { asc }) => [asc(t.date)],
  })
  res.json(result)
})

router.get('/conflicts', async (req: AuthRequest, res) => {
  const { date, driverId, vehicleId } = req.query as Record<string, string>
  if (!date) return res.status(400).json({ error: 'date required' })
  const conflicts = await checkConflicts(req.user!.companyId, driverId || '', vehicleId || '', new Date(date))
  res.json(conflicts)
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = tourSchema.parse(req.body)
    const conflicts = await checkConflicts(req.user!.companyId, data.driverId, data.vehicleId, new Date(data.date))
    if (conflicts.length > 0) return res.status(409).json({ conflicts })

    const tourId = createId()
    await db.insert(tours).values({
      id: tourId,
      name: data.name,
      date: new Date(data.date),
      driverId: data.driverId,
      vehicleId: data.vehicleId,
      type: data.type,
      billedPrice: data.billedPrice ?? null,
      recurrence: data.recurrence ?? null,
      startAddress: data.startAddress ?? null,
      endAddress: data.endAddress ?? null,
      companyId: req.user!.companyId,
    })

    if (data.stops.length > 0) {
      await db.insert(tourStops).values(data.stops.map(s => ({
        id: createId(),
        tourId,
        childId: s.childId,
        address: s.address,
        lat: s.lat ?? null,
        lng: s.lng ?? null,
        sequenceOrder: s.sequenceOrder,
        scheduledTime: s.scheduledTime ? new Date(s.scheduledTime) : null,
      })))
    }

    const tour = await db.query.tours.findFirst({
      where: (t, { eq }) => eq(t.id, tourId),
      with: tourWithRelations,
    })
    res.status(201).json(tour)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/geocode', async (req: AuthRequest, res) => {
  const tour = await db.query.tours.findFirst({
    where: (t, { and, eq }) => and(eq(t.id, req.params.id), eq(t.companyId, req.user!.companyId)),
    with: { stops: true },
  })
  if (!tour) return res.status(404).json({ error: 'Not found' })

  const stopsToGeocode = tour.stops.filter(s => !s.lat || !s.lng)
  let updated = 0

  for (const stop of stopsToGeocode) {
    try {
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(stop.address)}&limit=1`
      const geoRes = await fetch(url)
      const geoData: any = await geoRes.json()
      const feat = geoData.features?.[0]
      if (feat) {
        await db.update(tourStops)
          .set({ lat: feat.geometry.coordinates[1], lng: feat.geometry.coordinates[0] })
          .where(eq(tourStops.id, stop.id))
        updated++
      }
    } catch { /* skip */ }
  }

  res.json({ geocoded: updated, total: stopsToGeocode.length })
})

router.get('/:id', async (req: AuthRequest, res) => {
  const tour = await db.query.tours.findFirst({
    where: (t, { and, eq }) => and(eq(t.id, req.params.id), eq(t.companyId, req.user!.companyId)),
    with: tourWithRelations,
  })
  if (!tour) return res.status(404).json({ error: 'Not found' })
  res.json(tour)
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const data = tourSchema.partial().parse(req.body)
    const existing = await db.query.tours.findFirst({
      where: (t, { and, eq }) => and(eq(t.id, req.params.id), eq(t.companyId, req.user!.companyId)),
    })
    if (!existing) return res.status(404).json({ error: 'Not found' })

    if (data.driverId || data.vehicleId || data.date) {
      const conflicts = await checkConflicts(
        req.user!.companyId,
        data.driverId || existing.driverId,
        data.vehicleId || existing.vehicleId,
        data.date ? new Date(data.date) : existing.date,
        req.params.id,
      )
      if (conflicts.length > 0) return res.status(409).json({ conflicts })
    }

    const updateData: Partial<typeof tours.$inferInsert> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.date !== undefined) updateData.date = new Date(data.date)
    if (data.driverId !== undefined) updateData.driverId = data.driverId
    if (data.vehicleId !== undefined) updateData.vehicleId = data.vehicleId
    if (data.type !== undefined) updateData.type = data.type
    if (data.billedPrice !== undefined) updateData.billedPrice = data.billedPrice
    if (data.recurrence !== undefined) updateData.recurrence = data.recurrence ?? null
    if (data.startAddress !== undefined) updateData.startAddress = data.startAddress ?? null
    if (data.endAddress !== undefined) updateData.endAddress = data.endAddress ?? null

    await db.update(tours).set(updateData).where(eq(tours.id, req.params.id))

    if (data.stops) {
      await db.delete(tourStops).where(eq(tourStops.tourId, req.params.id))
      if (data.stops.length > 0) {
        await db.insert(tourStops).values(data.stops.map(s => ({
          id: createId(),
          tourId: req.params.id,
          childId: s.childId,
          address: s.address,
          lat: s.lat ?? null,
          lng: s.lng ?? null,
          sequenceOrder: s.sequenceOrder,
          scheduledTime: s.scheduledTime ? new Date(s.scheduledTime) : null,
        })))
      }
    }

    const tour = await db.query.tours.findFirst({
      where: (t, { eq }) => eq(t.id, req.params.id),
      with: tourWithRelations,
    })
    res.json(tour)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  const existing = await db.query.tours.findFirst({
    where: (t, { and, eq }) => and(eq(t.id, req.params.id), eq(t.companyId, req.user!.companyId)),
  })
  if (!existing) return res.status(404).json({ error: 'Not found' })

  await db.delete(tourStops).where(eq(tourStops.tourId, req.params.id))
  await db.delete(tourCosts).where(eq(tourCosts.tourId, req.params.id))
  await db.delete(tours).where(eq(tours.id, req.params.id))
  res.status(204).send()
})

router.post('/:id/optimize', async (req: AuthRequest, res) => {
  const tour = await db.query.tours.findFirst({
    where: (t, { and, eq }) => and(eq(t.id, req.params.id), eq(t.companyId, req.user!.companyId)),
    with: { stops: { orderBy: (s, { asc }) => [asc(s.sequenceOrder)] } },
  })
  if (!tour) return res.status(404).json({ error: 'Not found' })
  if (tour.stops.length < 2) return res.status(400).json({ error: 'Need at least 2 stops to optimize' })

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Google Maps API key not configured' })

  const waypoints = tour.stops.slice(1, -1).map(s => `via:${encodeURIComponent(s.address)}`).join('|')
  const origin = encodeURIComponent(tour.stops[0].address)
  const destination = encodeURIComponent(tour.stops[tour.stops.length - 1].address)
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypoints ? `&waypoints=optimize:true|${waypoints}` : ''}&key=${apiKey}`

  const response = await fetch(url)
  const mapsData: any = await response.json()

  if (mapsData.status !== 'OK') return res.status(400).json({ error: `Google Directions error: ${mapsData.status}` })

  const route = mapsData.routes[0]
  const distanceKm = route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0) / 1000
  const durationMin = Math.round(route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0) / 60)

  const waypointOrder: number[] = mapsData.routes[0].waypoint_order || []
  const reorderedStops = [
    tour.stops[0],
    ...waypointOrder.map(i => tour.stops.slice(1, -1)[i]),
    tour.stops[tour.stops.length - 1],
  ]

  await Promise.all(
    reorderedStops.map((stop, index) =>
      db.update(tourStops).set({ sequenceOrder: index }).where(eq(tourStops.id, stop.id))
    )
  )

  await db.update(tours).set({ distanceKm, durationMin }).where(eq(tours.id, req.params.id))

  const updated = await db.query.tours.findFirst({
    where: (t, { eq }) => eq(t.id, req.params.id),
    with: { stops: { orderBy: (s, { asc }) => [asc(s.sequenceOrder)], with: { child: true } } },
  })
  res.json(updated)
})

router.post('/:id/calculate-cost', async (req: AuthRequest, res) => {
  const tour = await db.query.tours.findFirst({
    where: (t, { and, eq }) => and(eq(t.id, req.params.id), eq(t.companyId, req.user!.companyId)),
    with: { driver: true, vehicle: true, cost: true },
  })
  if (!tour) return res.status(404).json({ error: 'Not found' })

  const company = await db.query.companies.findFirst({
    where: (c, { eq }) => eq(c.id, req.user!.companyId),
  })
  if (!company) return res.status(404).json({ error: 'Company not found' })

  const settings = company.costSettings as { fuelPricePerLiter: number; chargeRate: number; maintenanceCostPerKm: number; fixedMonthlyFees: number }
  const distanceKm = tour.distanceKm ?? 0
  const durationHours = (tour.durationMin ?? 0) / 60
  const tollCost = req.body.tollCost ?? (tour.cost?.tollCost ?? 0)

  const fuelCost = (distanceKm / 100) * settings.fuelPricePerLiter * tour.vehicle!.consumptionL100
  const salaryCost = durationHours * tour.driver!.hourlyRate * (1 + settings.chargeRate / 100)
  const maintenanceCost = distanceKm * settings.maintenanceCostPerKm
  const fixedCostShare = settings.fixedMonthlyFees / 30
  const totalCost = fuelCost + salaryCost + maintenanceCost + tollCost + fixedCostShare
  const margin = tour.billedPrice ? tour.billedPrice - totalCost : null

  const [cost] = await db.insert(tourCosts)
    .values({ id: createId(), tourId: req.params.id, fuelCost, salaryCost, maintenanceCost, tollCost, fixedCostShare, totalCost, margin })
    .onConflictDoUpdate({
      target: tourCosts.tourId,
      set: { fuelCost, salaryCost, maintenanceCost, tollCost, fixedCostShare, totalCost, margin },
    })
    .returning()

  res.json(cost)
})

export default router
