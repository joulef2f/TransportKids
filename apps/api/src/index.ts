import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import vehiclesRouter from './routes/vehicles'
import driversRouter from './routes/drivers'
import clientsRouter from './routes/clients'
import childrenRouter from './routes/children'
import toursRouter from './routes/tours'
import dashboardRouter from './routes/dashboard'
import companyRouter from './routes/company'

const app = express()
const PORT = process.env.PORT || 3000

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost:')) return callback(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    callback(null, false)
  },
  credentials: true,
}))
app.use(express.json())

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/vehicles', vehiclesRouter)
app.use('/api/v1/drivers', driversRouter)
app.use('/api/v1/clients', clientsRouter)
app.use('/api/v1/children', childrenRouter)
app.use('/api/v1/tours', toursRouter)
app.use('/api/v1/dashboard', dashboardRouter)
app.use('/api/v1/company', companyRouter)

app.get('/health', (_, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`))

export default app
