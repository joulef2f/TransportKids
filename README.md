# TransportKids Pro

Application de gestion de transport d'enfants pour entreprises de transport spécialisé.

## Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **ORM**: Prisma
- **Base de données**: PostgreSQL
- **Auth**: JWT (access 15min + refresh 7j)
- **Cartes**: Google Maps API

## Démarrage rapide

### Prérequis
- Node.js 18+
- PostgreSQL
- Google Maps API key

### Installation

```bash
npm install
```

### Configuration

Copier et remplir les variables d'environnement :

```bash
# Backend
cp apps/api/.env.example apps/api/.env

# Frontend
cp apps/web/.env.example apps/web/.env
```

### Base de données

```bash
# Générer le client Prisma
npm run db:generate

# Créer les tables
npm run db:migrate
```

### Lancer en développement

```bash
npm run dev
```

- Frontend : http://localhost:5173
- API : http://localhost:3000

## Structure

```
/apps
  /web        → React frontend (Vite)
  /api        → Express backend
/packages
  /shared     → Types TypeScript partagés
  /db         → Prisma schema
```

## Variables d'environnement

### Backend (`apps/api/.env`)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/transportkids
JWT_SECRET=...
JWT_REFRESH_SECRET=...
GOOGLE_MAPS_API_KEY=...
PORT=3000
```

### Frontend (`apps/web/.env`)
```
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_MAPS_API_KEY=...
```
