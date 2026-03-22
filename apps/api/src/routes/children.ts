import { Router } from 'express'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../lib/db'
import { children } from '../db/schema'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const childSchema = z.object({
  clientId: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  pickupAddress: z.string().min(1),
  schoolAddress: z.string().min(1),
  notes: z.string().optional().nullable(),
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = childSchema.parse(req.body)
    const client = await db.query.clients.findFirst({
      where: (c, { and, eq }) => and(eq(c.id, data.clientId), eq(c.companyId, req.user!.companyId)),
    })
    if (!client) return res.status(404).json({ error: 'Client not found' })

    const [child] = await db.insert(children).values({ id: createId(), ...data }).returning()
    res.status(201).json(child)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const data = childSchema.partial().omit({ clientId: true }).parse(req.body)
    const child = await db.query.children.findFirst({
      where: (c, { eq }) => eq(c.id, req.params.id),
      with: { client: true },
    })
    if (!child || child.client.companyId !== req.user!.companyId) return res.status(404).json({ error: 'Not found' })

    const [updated] = await db.update(children).set(data).where(eq(children.id, req.params.id)).returning()
    res.json(updated)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  const child = await db.query.children.findFirst({
    where: (c, { eq }) => eq(c.id, req.params.id),
    with: { client: true },
  })
  if (!child || child.client.companyId !== req.user!.companyId) return res.status(404).json({ error: 'Not found' })

  await db.delete(children).where(eq(children.id, req.params.id))
  res.status(204).send()
})

export default router
