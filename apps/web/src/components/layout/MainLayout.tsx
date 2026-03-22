import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Truck, Users, Baby, Map, Settings, LogOut, Bus, MapPin } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/tours', icon: Map, label: 'Tournées' },
  { to: '/vehicles', icon: Truck, label: 'Véhicules' },
  { to: '/drivers', icon: Users, label: 'Chauffeurs' },
  { to: '/clients', icon: Baby, label: 'Clients & Enfants' },
  { to: '/map', icon: MapPin, label: 'Carte' },
  { to: '/settings', icon: Settings, label: 'Paramètres' },
]

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex h-screen w-64 flex-col border-r bg-card">
        <div className="flex items-center gap-2 border-b px-6 py-4">
          <Bus className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">TransportKids Pro</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t px-3 py-4">
          <div className="mb-2 px-3 text-xs text-muted-foreground truncate">{user?.email}</div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto max-w-7xl px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
