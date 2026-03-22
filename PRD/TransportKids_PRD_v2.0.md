# TransportKids Pro — PRD v2.0
> **Instructions pour l'IA** : Ce document est une spécification complète. Implémente chaque section dans l'ordre. Ne génère pas de code placeholder — chaque fonctionnalité listée doit être entièrement fonctionnelle. Pose des questions si une ambiguïté bloque l'implémentation.

---

## STACK TECHNIQUE — Ne pas dévier sans raison explicite

```
Frontend  : React 18 + TypeScript + Tailwind CSS + shadcn/ui
Backend   : Node.js + Express + TypeScript
ORM       : Prisma
Database  : PostgreSQL
Auth      : JWT (access token 15min + refresh token 7j)
Maps      : Google Maps API (Maps JS SDK + Directions API + Places Autocomplete)
Tests     : Vitest (unit) + Playwright (e2e)
Lint      : ESLint + Prettier
```

**Structure monorepo :**
```
/apps
  /web        → React frontend
  /api        → Express backend
/packages
  /shared     → types TypeScript partagés (DTOs, enums, interfaces)
  /db         → Prisma schema + migrations
```

---

## SCHÉMA BASE DE DONNÉES (Prisma)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         Role     @default(ADMIN)
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id])
  createdAt    DateTime @default(now())
}

enum Role {
  ADMIN
  DRIVER
}

model Company {
  id           String    @id @default(cuid())
  name         String
  siret        String?
  costSettings Json      // { fuelPricePerLiter, chargeRate, maintenanceCostPerKm, fixedMonthlyFees }
  users        User[]
  vehicles     Vehicle[]
  drivers      Driver[]
  clients      Client[]
  tours        Tour[]
}

model Vehicle {
  id              String    @id @default(cuid())
  companyId       String
  company         Company   @relation(fields: [companyId], references: [id])
  plate           String
  brand           String
  model           String
  capacity        Int
  fuelType        FuelType
  consumptionL100 Float     // litres/100km
  kmTotal         Int       @default(0)
  nextServiceKm   Int?
  insuranceExpiry DateTime?
  controlExpiry   DateTime? // contrôle technique
  status          VehicleStatus @default(AVAILABLE)
  tours           Tour[]
}

enum FuelType { DIESEL PETROL ELECTRIC HYBRID }
enum VehicleStatus { AVAILABLE MAINTENANCE UNAVAILABLE }

model Driver {
  id           String       @id @default(cuid())
  companyId    String
  company      Company      @relation(fields: [companyId], references: [id])
  firstName    String
  lastName     String
  phone        String
  licenseNum   String
  licenseExpiry DateTime?
  hourlyRate   Float        // brut/heure
  status       DriverStatus @default(ACTIVE)
  tours        Tour[]
}

enum DriverStatus { ACTIVE INACTIVE }

model Client {
  id           String      @id @default(cuid())
  companyId    String
  company      Company     @relation(fields: [companyId], references: [id])
  name         String
  type         ClientType
  address      String
  contactEmail String?
  contactPhone String?
  children     Child[]
  invoices     Invoice[]
}

enum ClientType { SCHOOL MDPH CPAM ARS PRIVATE OTHER }

model Child {
  id             String    @id @default(cuid())
  clientId       String
  client         Client    @relation(fields: [clientId], references: [id])
  firstName      String
  lastName       String
  pickupAddress  String
  schoolAddress  String
  notes          String?
  tourStops      TourStop[]
}

model Tour {
  id          String     @id @default(cuid())
  companyId   String
  company     Company    @relation(fields: [companyId], references: [id])
  name        String
  date        DateTime
  driverId    String
  driver      Driver     @relation(fields: [driverId], references: [id])
  vehicleId   String
  vehicle     Vehicle    @relation(fields: [vehicleId], references: [id])
  type        TourType
  status      TourStatus @default(PLANNED)
  billedPrice Float?
  distanceKm  Float?
  durationMin Int?
  recurrence  Json?      // { type: 'weekly', days: [1,2,3] } | null
  stops       TourStop[]
  cost        TourCost?
  createdAt   DateTime   @default(now())
}

enum TourType { ONE_WAY ROUND_TRIP MULTI }
enum TourStatus { PLANNED IN_PROGRESS DONE CANCELLED }

model TourStop {
  id            String   @id @default(cuid())
  tourId        String
  tour          Tour     @relation(fields: [tourId], references: [id])
  childId       String
  child         Child    @relation(fields: [childId], references: [id])
  address       String
  lat           Float?
  lng           Float?
  sequenceOrder Int
  scheduledTime DateTime?
  actualTime    DateTime?
}

model TourCost {
  id              String @id @default(cuid())
  tourId          String @unique
  tour            Tour   @relation(fields: [tourId], references: [id])
  fuelCost        Float
  salaryCost      Float
  maintenanceCost Float
  tollCost        Float  @default(0)
  fixedCostShare  Float
  totalCost       Float
  margin          Float? // billedPrice - totalCost
}

model Invoice {
  id          String        @id @default(cuid())
  clientId    String
  client      Client        @relation(fields: [clientId], references: [id])
  month       Int
  year        Int
  totalAmount Float
  status      InvoiceStatus @default(PENDING)
  generatedAt DateTime      @default(now())
}

enum InvoiceStatus { PENDING PAID OVERDUE }
```

---

## API REST — Endpoints à implémenter

> Toutes les routes sont préfixées `/api/v1`. Toutes les routes sauf `/auth/*` requièrent un JWT valide dans le header `Authorization: Bearer <token>`.

### Auth
```
POST /auth/register    body: { email, password, companyName }
POST /auth/login       body: { email, password } → { accessToken, refreshToken }
POST /auth/refresh     body: { refreshToken } → { accessToken }
```

### Vehicles `/vehicles`
```
GET    /vehicles               → liste tous les véhicules de la company
POST   /vehicles               body: VehicleCreateDTO
GET    /vehicles/:id
PUT    /vehicles/:id           body: VehicleUpdateDTO
DELETE /vehicles/:id
GET    /vehicles/:id/alerts    → retourne les alertes actives (CT, assurance, entretien)
```

### Drivers `/drivers`
```
GET    /drivers
POST   /drivers               body: DriverCreateDTO
GET    /drivers/:id
PUT    /drivers/:id
DELETE /drivers/:id
GET    /drivers/:id/schedule  query: { from, to } → tournées affectées sur la période
```

### Clients `/clients`
```
GET    /clients
POST   /clients
GET    /clients/:id
PUT    /clients/:id
DELETE /clients/:id
GET    /clients/:id/children
```

### Children `/children`
```
POST   /children              body: ChildCreateDTO
PUT    /children/:id
DELETE /children/:id
```

### Tours `/tours`
```
GET    /tours                 query: { from, to, driverId, vehicleId, status }
POST   /tours                 body: TourCreateDTO
GET    /tours/:id
PUT    /tours/:id
DELETE /tours/:id
POST   /tours/:id/optimize    → appelle Google Directions, réordonne les stops, calcule distanceKm + durationMin
POST   /tours/:id/calculate-cost → calcule et persiste TourCost
GET    /tours/conflicts       query: { date, driverId?, vehicleId? } → liste les conflits
```

### Dashboard `/dashboard`
```
GET    /dashboard/summary     query: { month, year } → { revenue, totalCost, margin, kmTotal, tourCount }
GET    /dashboard/tours-ranking query: { month, year } → tours triés par marge décroissante
GET    /dashboard/kpis        query: { from, to } → séries temporelles pour graphiques
```

### Company `/company`
```
GET    /company/settings
PUT    /company/settings      body: CostSettingsDTO
```

---

## LOGIQUE MÉTIER CRITIQUE

### Calcul des coûts d'une tournée (`POST /tours/:id/calculate-cost`)

```typescript
function calculateTourCost(tour: Tour, settings: CostSettings): TourCost {
  const distanceKm = tour.distanceKm ?? 0
  const durationHours = (tour.durationMin ?? 0) / 60

  const fuelCost = (distanceKm / 100) * settings.fuelPricePerLiter * vehicle.consumptionL100
  const salaryCost = durationHours * driver.hourlyRate * (1 + settings.chargeRate / 100)
  const maintenanceCost = distanceKm * settings.maintenanceCostPerKm
  const fixedCostShare = settings.fixedMonthlyFees / 30 // part journalière

  const totalCost = fuelCost + salaryCost + maintenanceCost + tour.tollCost + fixedCostShare
  const margin = tour.billedPrice ? tour.billedPrice - totalCost : null

  return { fuelCost, salaryCost, maintenanceCost, tollCost: tour.tollCost, fixedCostShare, totalCost, margin }
}
```

### Détection des conflits

Avant d'enregistrer une tournée, vérifier en DB :
- Même `driverId` + plage horaire qui se chevauche + status !== CANCELLED
- Même `vehicleId` + plage horaire qui se chevauche + status !== CANCELLED

Si conflit → retourner HTTP 409 avec `{ conflicts: [{ type: 'driver'|'vehicle', tourId, tourName }] }`

### Alertes véhicules

Un véhicule déclenche une alerte si :
- `kmTotal >= nextServiceKm - 500` → alerte entretien
- `insuranceExpiry` dans moins de 30 jours → alerte assurance
- `controlExpiry` dans moins de 30 jours → alerte contrôle technique

---

## FRONTEND — Pages et composants

### Structure des routes React
```
/login
/dashboard                    → tableau de bord mensuel
/tours                        → liste + calendrier
/tours/new                    → formulaire création
/tours/:id                    → détail + carte + coûts
/map                          → carte globale toutes tournées du jour
/vehicles                     → liste véhicules
/vehicles/:id                 → fiche + alertes
/drivers                      → liste chauffeurs
/drivers/:id                  → fiche + planning
/clients                      → liste clients
/clients/:id                  → fiche + enfants + récapitulatif
/settings                     → paramètres coûts company
```

### Composants clés à implémenter

**`<TourForm />`**
- Champs : nom, date, type, driverId (select), vehicleId (select)
- Section stops : liste d'arrêts avec autocomplétion Google Places sur le champ adresse, association d'un enfant par stop, réordonnancement drag & drop
- Bouton "Optimiser le trajet" → appelle `POST /tours/:id/optimize` → met à jour l'ordre des stops et affiche distance + durée
- Champ prix facturé → déclenche `POST /tours/:id/calculate-cost` → affiche breakdown des coûts en temps réel

**`<TourMap />`**
- Utilise Google Maps JS SDK
- Affiche les markers des stops (numérotés dans l'ordre)
- Trace la polyline de l'itinéraire (depuis Google Directions)
- Popup sur chaque marker : nom de l'enfant + heure prévue

**`<GlobalMap />`**
- Affiche toutes les tournées du jour sélectionné
- Couleur des polylines selon le statut : bleu=PLANNED, vert=IN_PROGRESS, gris=DONE, rouge=CANCELLED
- Panneau latéral listant les tournées, clic → zoom sur la tournée

**`<CostBreakdown />`**
- Props : `tourCost: TourCost, billedPrice: number`
- Graphique camembert (recharts) des postes de coûts
- Ligne "Marge brute" avec badge vert/rouge selon valeur positive/négative

**`<ConflictAlert />`**
- S'affiche au-dessus du formulaire si l'API retourne un 409
- Liste les conflits avec lien vers la tournée concernée

**`<DashboardSummary />`**
- 4 KPI cards : CA, Coûts, Marge, Km parcourus
- Graphique barres (recharts) : CA vs Coûts sur les 12 derniers mois
- Tableau des 10 tournées les moins rentables du mois

**`<AlertBadge />`**
- Affiché sur les fiches véhicule et dans la navigation
- Badge rouge avec compte des alertes actives

---

## RÈGLES UX NON NÉGOCIABLES

1. **Toute action destructive** (suppression) → confirmation dialog avant exécution
2. **Formulaires** → validation côté client (zod) avant envoi API, messages d'erreur inline
3. **États de chargement** → skeleton loaders sur toutes les listes, spinner sur les boutons d'action
4. **Erreurs API** → toast notification (shadcn/ui `<Sonner />`) pour chaque erreur 4xx/5xx
5. **Conflits de planning** → bloquants visuellement, ne pas permettre la sauvegarde sans acknowledgement explicite
6. **Marge négative** → highlight rouge dans tous les tableaux et récapitulatifs

---

## ORDRE D'IMPLÉMENTATION RECOMMANDÉ

1. Setup monorepo + Prisma schema + migrations
2. Auth (register, login, JWT middleware)
3. CRUD Vehicles + Drivers + Clients + Children
4. CRUD Tours + TourStops
5. Intégration Google Maps (optimize endpoint)
6. Moteur de calcul des coûts
7. Détection des conflits
8. Dashboard endpoints
9. Frontend : layout, auth, navigation
10. Frontend : pages Vehicles, Drivers, Clients
11. Frontend : TourForm + TourMap
12. Frontend : GlobalMap
13. Frontend : Dashboard + CostBreakdown
14. Alertes véhicules + badges
15. Export CSV/PDF (récapitulatifs clients)

---

## VARIABLES D'ENVIRONNEMENT REQUISES

```env
# Backend
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
GOOGLE_MAPS_API_KEY=...

# Frontend
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_MAPS_API_KEY=...
```

---

## CE QUI EST HORS PÉRIMÈTRE (ne pas implémenter)

- Application mobile (V2)
- Notifications SMS/push
- Génération de factures PDF
- Connexion logiciel comptable
- Portail famille / tracking temps réel
- Authentification chauffeur (V2)
