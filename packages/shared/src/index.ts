// Enums
export enum Role { ADMIN = 'ADMIN', DRIVER = 'DRIVER' }
export enum FuelType { DIESEL = 'DIESEL', PETROL = 'PETROL', ELECTRIC = 'ELECTRIC', HYBRID = 'HYBRID' }
export enum VehicleStatus { AVAILABLE = 'AVAILABLE', MAINTENANCE = 'MAINTENANCE', UNAVAILABLE = 'UNAVAILABLE' }
export enum DriverStatus { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE' }
export enum ClientType { SCHOOL = 'SCHOOL', MDPH = 'MDPH', CPAM = 'CPAM', ARS = 'ARS', PRIVATE = 'PRIVATE', OTHER = 'OTHER' }
export enum TourType { ONE_WAY = 'ONE_WAY', ROUND_TRIP = 'ROUND_TRIP', MULTI = 'MULTI' }
export enum TourStatus { PLANNED = 'PLANNED', IN_PROGRESS = 'IN_PROGRESS', DONE = 'DONE', CANCELLED = 'CANCELLED' }
export enum InvoiceStatus { PENDING = 'PENDING', PAID = 'PAID', OVERDUE = 'OVERDUE' }

// Cost Settings
export interface CostSettings {
  fuelPricePerLiter: number
  chargeRate: number
  maintenanceCostPerKm: number
  fixedMonthlyFees: number
}

// DTOs
export interface VehicleCreateDTO {
  plate: string
  brand: string
  model: string
  capacity: number
  fuelType: FuelType
  consumptionL100: number
  kmTotal?: number
  nextServiceKm?: number
  insuranceExpiry?: string
  controlExpiry?: string
  status?: VehicleStatus
}
export type VehicleUpdateDTO = Partial<VehicleCreateDTO>

export interface DriverCreateDTO {
  firstName: string
  lastName: string
  phone: string
  licenseNum: string
  licenseExpiry?: string
  hourlyRate: number
  status?: DriverStatus
}
export type DriverUpdateDTO = Partial<DriverCreateDTO>

export interface ClientCreateDTO {
  name: string
  type: ClientType
  address: string
  contactEmail?: string
  contactPhone?: string
}
export type ClientUpdateDTO = Partial<ClientCreateDTO>

export interface ChildCreateDTO {
  clientId: string
  firstName: string
  lastName: string
  pickupAddress: string
  schoolAddress: string
  notes?: string
}
export type ChildUpdateDTO = Partial<Omit<ChildCreateDTO, 'clientId'>>

export interface TourStopCreateDTO {
  childId: string
  address: string
  lat?: number
  lng?: number
  sequenceOrder: number
  scheduledTime?: string
}

export interface TourCreateDTO {
  name: string
  date: string
  driverId: string
  vehicleId: string
  type: TourType
  billedPrice?: number
  recurrence?: { type: string; days: number[] } | null
  stops: TourStopCreateDTO[]
}
export type TourUpdateDTO = Partial<TourCreateDTO>

export interface CostSettingsDTO {
  fuelPricePerLiter: number
  chargeRate: number
  maintenanceCostPerKm: number
  fixedMonthlyFees: number
}

export interface TourCostDTO {
  fuelCost: number
  salaryCost: number
  maintenanceCost: number
  tollCost: number
  fixedCostShare: number
  totalCost: number
  margin: number | null
}

export interface VehicleAlert {
  type: 'maintenance' | 'insurance' | 'control'
  message: string
  severity: 'warning' | 'critical'
}

export interface ConflictError {
  type: 'driver' | 'vehicle'
  tourId: string
  tourName: string
}

export interface DashboardSummary {
  revenue: number
  totalCost: number
  margin: number
  kmTotal: number
  tourCount: number
}
