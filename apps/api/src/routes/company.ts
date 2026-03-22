import { Router } from 'express'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { companies } from '../db/schema'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const settingsSchema = z.object({
  fuelPricePerLiter: z.number().positive(),
  chargeRate: z.number().min(0),
  maintenanceCostPerKm: z.number().min(0),
  fixedMonthlyFees: z.number().min(0),
})

router.get('/settings', async (req: AuthRequest, res) => {
  const company = await db.query.companies.findFirst({
    where: (c, { eq }) => eq(c.id, req.user!.companyId),
  })
  if (!company) return res.status(404).json({ error: 'Company not found' })
  res.json({ id: company.id, name: company.name, siret: company.siret, costSettings: company.costSettings })
})

router.put('/settings', async (req: AuthRequest, res) => {
  try {
    const settings = settingsSchema.parse(req.body)
    const [company] = await db.update(companies)
      .set({ costSettings: settings })
      .where(eq(companies.id, req.user!.companyId))
      .returning()
    res.json(company.costSettings)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
