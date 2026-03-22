import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LayoutDashboard, Car, Users, UserCheck, Map, Settings, LogOut, Bus, ChevronRight, Baby } from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/tours', label: 'Tournées', icon: Bus },
  { to: '/map', label: 'Carte', icon: Map },
  { to: '/vehicles', label: 'Véhicules', icon: Car },
  { to: '/drivers', label: 'Chauffeurs', icon: UserCheck },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/children', label: 'Personnes transportées', icon: Baby },
  { to: '/settings', label: 'Paramètres', icon: Settings },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 flex flex-col flex-shrink-0"
        style={{ background: 'rgba(5, 8, 15, 0.98)', borderRight: '1px solid rgba(0, 212, 255, 0.12)' }}>

        <div className="p-5" style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.1)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)', boxShadow: '0 0 20px rgba(0,212,255,0.35)' }}>
              <Bus className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest" style={{ color: '#00d4ff', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.15em' }}>TRANSPORT</p>
              <p className="text-xs font-semibold tracking-widest" style={{ color: 'rgba(168,85,247,0.85)', letterSpacing: '0.2em' }}>KIDS PRO</p>
            </div>
          </div>
          <p className="text-xs mt-3 truncate" style={{ color: 'rgba(255,255,255,0.28)' }}>{user?.email}</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = to === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(to)
            return (
              <Link key={to} to={to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 relative group"
                style={{
                  color: isActive ? '#000' : 'rgba(255,255,255,0.45)',
                  background: isActive ? 'linear-gradient(135deg, #00d4ff, #0077ee)' : 'transparent',
                  boxShadow: isActive ? '0 0 18px rgba(0,212,255,0.22)' : 'none',
                  fontWeight: isActive ? 600 : 400,
                }}>
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
                {!isActive && (
                  <span className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: 'rgba(0,212,255,0.07)' }} />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid rgba(0,212,255,0.1)' }}>
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-all duration-150"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
