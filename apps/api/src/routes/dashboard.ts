import { Router } from 'express'
import { db } from '../lib/db'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/summary', async (req: AuthRequest, res) => {
  const { month, year } = req.query as { month: string; year: string }
  const m = parseInt(month) || new Date().getMonth() + 1
  const y = parseInt(year) || new Date().getFullYear()
  const from = new Date(y, m - 1, 1)
  const to = new Date(y, m, 0, 23, 59, 59, 999)

  const toursData = await db.query.tours.findMany({
    where: (t, { and, eq, gte, lte }) => and(
      eq(t.companyId, req.user!.companyId),
      gte(t.date, from),
      lte(t.date, to),
    ),
    with: { cost: true },
  })

  const revenue = toursData.reduce((s, t) => s + (t.billedPrice ?? 0), 0)
  const totalCost = toursData.reduce((s, t) => s + (t.cost?.totalCost ?? 0), 0)
  const margin = revenue - totalCost
  const kmTotal = toursData.reduce((s, t) => s + (t.distanceKm ?? 0), 0)

  res.json({ revenue, totalCost, margin, kmTotal, tourCount: toursData.length })
})

router.get('/tours-ranking', async (req: AuthRequest, res) => {
  const { month, year } = req.query as { month: string; year: string }
  const m = parseInt(month) || new Date().getMonth() + 1
  const y = parseInt(year) || new Date().getFullYear()
  const from = new Date(y, m - 1, 1)
  const to = new Date(y, m, 0, 23, 59, 59, 999)

  const toursData = await db.query.tours.findMany({
    where: (t, { and, eq, gte, lte }) => and(
      eq(t.companyId, req.user!.companyId),
      gte(t.date, from),
      lte(t.date, to),
    ),
    with: { cost: true, driver: true, vehicle: true },
  })

  toursData.sort((a, b) => (b.cost?.margin ?? -Infinity) - (a.cost?.margin ?? -Infinity))

  res.json(toursData)
})

router.get('/kpis', async (req: AuthRequest, res) => {
  const { from, to } = req.query as { from: string; to: string }
  const fromDate = from ? new Date(from) : new Date(new Date().setMonth(new Date().getMonth() - 11))
  const toDate = to ? new Date(to) : new Date()

  const toursData = await db.query.tours.findMany({
    where: (t, { and, eq, gte, lte }) => and(
      eq(t.companyId, req.user!.companyId),
      gte(t.date, fromDate),
      lte(t.date, toDate),
    ),
    with: { cost: true },
    orderBy: (t, { asc }) => [asc(t.date)],
  })

  const byMonth: Record<string, { revenue: number; cost: number; km: number; count: number }> = {}
  toursData.forEach(t => {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`
    if (!byMonth[key]) byMonth[key] = { revenue: 0, cost: 0, km: 0, count: 0 }
    byMonth[key].revenue += t.billedPrice ?? 0
    byMonth[key].cost += t.cost?.totalCost ?? 0
    byMonth[key].km += t.distanceKm ?? 0
    byMonth[key].count += 1
  })

  res.json(Object.entries(byMonth).map(([month, data]) => ({ month, ...data })))
})

export default router
