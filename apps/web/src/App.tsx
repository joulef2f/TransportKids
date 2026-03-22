import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { VehiclesPage } from '@/pages/VehiclesPage'
import { VehicleDetailPage } from '@/pages/VehicleDetailPage'
import { DriversPage } from '@/pages/DriversPage'
import { DriverDetailPage } from '@/pages/DriverDetailPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { ClientDetailPage } from '@/pages/ClientDetailPage'
import { ToursPage } from '@/pages/ToursPage'
import { TourDetailPage } from '@/pages/TourDetailPage'
import { TourFormPage } from '@/pages/TourFormPage'
import { MapPage } from '@/pages/MapPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ChildrenPage } from '@/pages/ChildrenPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/vehicles" element={<ProtectedRoute><VehiclesPage /></ProtectedRoute>} />
      <Route path="/vehicles/:id" element={<ProtectedRoute><VehicleDetailPage /></ProtectedRoute>} />
      <Route path="/drivers" element={<ProtectedRoute><DriversPage /></ProtectedRoute>} />
      <Route path="/drivers/:id" element={<ProtectedRoute><DriverDetailPage /></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
      <Route path="/clients/:id" element={<ProtectedRoute><ClientDetailPage /></ProtectedRoute>} />
      <Route path="/tours" element={<ProtectedRoute><ToursPage /></ProtectedRoute>} />
      <Route path="/tours/new" element={<ProtectedRoute><TourFormPage /></ProtectedRoute>} />
      <Route path="/tours/:id/edit" element={<ProtectedRoute><TourFormPage /></ProtectedRoute>} />
      <Route path="/tours/:id" element={<ProtectedRoute><TourDetailPage /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/children" element={<ProtectedRoute><ChildrenPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  )
}
