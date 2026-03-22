import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'

const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,
  prepare: false, // required for PgBouncer/Supabase transaction mode
})

export const db = drizzle(sql, { schema })
