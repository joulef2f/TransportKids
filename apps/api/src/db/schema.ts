import {
  pgTable,
  pgEnum,
  text,
  integer,
  doublePrecision,
  timestamp,
  json,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

// Enums (must match names created by Prisma)
export const roleEnum = pgEnum('Role', ['ADMIN', 'DRIVER'])
export const fuelTypeEnum = pgEnum('FuelType', ['DIESEL', 'PETROL', 'ELECTRIC', 'HYBRID'])
export const vehicleStatusEnum = pgEnum('VehicleStatus', ['AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE'])
export const driverStatusEnum = pgEnum('DriverStatus', ['ACTIVE', 'INACTIVE'])
export const clientTypeEnum = pgEnum('ClientType', ['SCHOOL', 'MDPH', 'CPAM', 'ARS', 'PRIVATE', 'OTHER'])
export const tourTypeEnum = pgEnum('TourType', ['ONE_WAY', 'ROUND_TRIP', 'MULTI'])
export const tourStatusEnum = pgEnum('TourStatus', ['PLANNED', 'IN_PROGRESS', 'DONE', 'CANCELLED'])
export const invoiceStatusEnum = pgEnum('InvoiceStatus', ['PENDING', 'PAID', 'OVERDUE'])

export const companies = pgTable('Company', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  siret: text('siret'),
  costSettings: json('costSettings').notNull(),
})

export const users = pgTable('User', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  passwordHash: text('passwordHash').notNull(),
  role: roleEnum('role').notNull().default('ADMIN'),
  companyId: text('companyId').notNull().references(() => companies.id),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const vehicles = pgTable('Vehicle', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  companyId: text('companyId').notNull().references(() => companies.id),
  plate: text('plate').notNull(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  capacity: integer('capacity').notNull(),
  fuelType: fuelTypeEnum('fuelType').notNull(),
  consumptionL100: doublePrecision('consumptionL100').notNull(),
  kmTotal: integer('kmTotal').notNull().default(0),
  nextServiceKm: integer('nextServiceKm'),
  insuranceExpiry: timestamp('insuranceExpiry'),
  controlExpiry: timestamp('controlExpiry'),
  status: vehicleStatusEnum('status').notNull().default('AVAILABLE'),
})

export const drivers = pgTable('Driver', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  companyId: text('companyId').notNull().references(() => companies.id),
  firstName: text('firstName').notNull(),
  lastName: text('lastName').notNull(),
  phone: text('phone').notNull(),
  licenseNum: text('licenseNum').notNull(),
  licenseExpiry: timestamp('licenseExpiry'),
  hourlyRate: doublePrecision('hourlyRate').notNull(),
  status: driverStatusEnum('status').notNull().default('ACTIVE'),
})

export const clients = pgTable('Client', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  companyId: text('companyId').notNull().references(() => companies.id),
  name: text('name').notNull(),
  type: clientTypeEnum('type').notNull(),
  address: text('address').notNull(),
  contactEmail: text('contactEmail'),
  contactPhone: text('contactPhone'),
})

export const children = pgTable('Child', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  clientId: text('clientId').notNull().references(() => clients.id),
  firstName: text('firstName').notNull(),
  lastName: text('lastName').notNull(),
  pickupAddress: text('pickupAddress').notNull(),
  schoolAddress: text('schoolAddress').notNull(),
  notes: text('notes'),
})

export const tours = pgTable('Tour', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  companyId: text('companyId').notNull().references(() => companies.id),
  name: text('name').notNull(),
  date: timestamp('date').notNull(),
  driverId: text('driverId').notNull().references(() => drivers.id),
  vehicleId: text('vehicleId').notNull().references(() => vehicles.id),
  type: tourTypeEnum('type').notNull(),
  status: tourStatusEnum('status').notNull().default('PLANNED'),
  billedPrice: doublePrecision('billedPrice'),
  distanceKm: doublePrecision('distanceKm'),
  durationMin: integer('durationMin'),
  recurrence: json('recurrence'),
  startAddress: text('startAddress'),
  endAddress: text('endAddress'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const tourStops = pgTable('TourStop', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  tourId: text('tourId').notNull().references(() => tours.id),
  childId: text('childId').notNull().references(() => children.id),
  address: text('address').notNull(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  sequenceOrder: integer('sequenceOrder').notNull(),
  scheduledTime: timestamp('scheduledTime'),
  actualTime: timestamp('actualTime'),
})

export const tourCosts = pgTable('TourCost', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  tourId: text('tourId').notNull().unique().references(() => tours.id),
  fuelCost: doublePrecision('fuelCost').notNull(),
  salaryCost: doublePrecision('salaryCost').notNull(),
  maintenanceCost: doublePrecision('maintenanceCost').notNull(),
  tollCost: doublePrecision('tollCost').notNull().default(0),
  fixedCostShare: doublePrecision('fixedCostShare').notNull(),
  totalCost: doublePrecision('totalCost').notNull(),
  margin: doublePrecision('margin'),
})

export const invoices = pgTable('Invoice', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  clientId: text('clientId').notNull().references(() => clients.id),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  totalAmount: doublePrecision('totalAmount').notNull(),
  status: invoiceStatusEnum('status').notNull().default('PENDING'),
  generatedAt: timestamp('generatedAt').notNull().defaultNow(),
})

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  vehicles: many(vehicles),
  drivers: many(drivers),
  clients: many(clients),
  tours: many(tours),
}))

export const usersRelations = relations(users, ({ one }) => ({
  company: one(companies, { fields: [users.companyId], references: [companies.id] }),
}))

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  company: one(companies, { fields: [vehicles.companyId], references: [companies.id] }),
  tours: many(tours),
}))

export const driversRelations = relations(drivers, ({ one, many }) => ({
  company: one(companies, { fields: [drivers.companyId], references: [companies.id] }),
  tours: many(tours),
}))

export const clientsRelations = relations(clients, ({ one, many }) => ({
  company: one(companies, { fields: [clients.companyId], references: [companies.id] }),
  children: many(children),
  invoices: many(invoices),
}))

export const childrenRelations = relations(children, ({ one, many }) => ({
  client: one(clients, { fields: [children.clientId], references: [clients.id] }),
  tourStops: many(tourStops),
}))

export const toursRelations = relations(tours, ({ one, many }) => ({
  company: one(companies, { fields: [tours.companyId], references: [companies.id] }),
  driver: one(drivers, { fields: [tours.driverId], references: [drivers.id] }),
  vehicle: one(vehicles, { fields: [tours.vehicleId], references: [vehicles.id] }),
  stops: many(tourStops),
  cost: one(tourCosts, { fields: [tours.id], references: [tourCosts.tourId] }),
}))

export const tourStopsRelations = relations(tourStops, ({ one }) => ({
  tour: one(tours, { fields: [tourStops.tourId], references: [tours.id] }),
  child: one(children, { fields: [tourStops.childId], references: [children.id] }),
}))

export const tourCostsRelations = relations(tourCosts, ({ one }) => ({
  tour: one(tours, { fields: [tourCosts.tourId], references: [tours.id] }),
}))

export const invoicesRelations = relations(invoices, ({ one }) => ({
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
}))
