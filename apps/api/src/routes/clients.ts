import { Router } from 'express'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../lib/db'
import { clients, children } from '../db/schema'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const clientSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['SCHOOL', 'MDPH', 'CPAM', 'ARS', 'PRIVATE', 'OTHER']),
  address: z.string().min(1),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
})

router.get('/', async (req: AuthRequest, res) => {
  const result = await db.query.clients.findMany({
    where: (c, { eq }) => eq(c.companyId, req.user!.companyId),
  })
  res.json(result)
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = clientSchema.parse(req.body)
    const [client] = await db.insert(clients).values({
      id: createId(),
      ...data,
      companyId: req.user!.companyId,
    }).returning()
    res.status(201).json(client)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req: AuthRequest, res) => {
  const client = await db.query.clients.findFirst({
    where: (c, { and, eq }) => and(eq(c.id, req.params.id), eq(c.companyId, req.user!.companyId)),
    with: { children: true, invoices: true },
  })
  if (!client) return res.status(404).json({ error: 'Not found' })
  res.json(client)
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const data = clientSchema.partial().parse(req.body)
    const updated = await db.update(clients)
      .set(data)
      .where(and(eq(clients.id, req.params.id), eq(clients.companyId, req.user!.companyId)))
      .returning()
    if (!updated.length) return res.status(404).json({ error: 'Not found' })
    res.json(updated[0])
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  const result = await db.delete(clients)
    .where(and(eq(clients.id, req.params.id), eq(clients.companyId, req.user!.companyId)))
    .returning({ id: clients.id })
  if (!result.length) return res.status(404).json({ error: 'Not found' })
  res.status(204).send()
})

router.get('/:id/children', async (req: AuthRequest, res) => {
  const client = await db.query.clients.findFirst({
    where: (c, { and, eq }) => and(eq(c.id, req.params.id), eq(c.companyId, req.user!.companyId)),
  })
  if (!client) return res.status(404).json({ error: 'Not found' })

  const result = await db.query.children.findMany({
    where: (c, { eq }) => eq(c.clientId, req.params.id),
  })
  res.json(result)
})

export default router
