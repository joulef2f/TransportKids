import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api } from '@/lib/api'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TourMap } from '@/components/TourMap'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, MapPin, Calculator, Zap } from 'lucide-react'

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'secondary' | 'destructive' }> = {
  PLANNED: { label: 'Planifiée', variant: 'default' },
  IN_PROGRESS: { label: 'En cours', variant: 'success' },
  DONE: { label: 'Terminée', variant: 'secondary' },
  CANCELLED: { label: 'Annulée', variant: 'destructive' },
}

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6']

export function TourDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tour, setTour] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [tollCost, setTollCost] = useState('0')

  const load = async () => {
    if (!id) return
    setLoading(true)
    const t = await api.tours.get(id)
    setTour(t)
    if (t.cost) setTollCost(String(t.cost.tollCost || 0))
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  const handleOptimize = async () => {
    setOptimizing(true)
    try {
      await api.tours.optimize(id!)
      toast.success('Trajet optimisé')
      load()
    } catch (err: any) { toast.error(err.body?.error || 'Erreur d\'optimisation') }
    finally { setOptimizing(false) }
  }

  const handleCalculateCost = async () => {
    setCalculating(true)
    try {
      await api.tours.calculateCost(id!, parseFloat(tollCost) || 0)
      toast.success('Coûts calculés')
      load()
    } catch (err: any) { toast.error(err.body?.error || 'Erreur de calcul') }
    finally { setCalculating(false) }
  }

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

  if (loading) return <Layout><div className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div></Layout>
  if (!tour) return <Layout><div className="p-6">Tournée introuvable</div></Layout>

  const st = statusConfig[tour.status] || statusConfig.PLANNED
  const costData = tour.cost ? [
    { name: 'Carburant', value: tour.cost.fuelCost },
    { name: 'Salaire', value: tour.cost.salaryCost },
    { name: 'Maintenance', value: tour.cost.maintenanceCost },
    { name: 'Péages', value: tour.cost.tollCost },
    { name: 'Frais fixes', value: tour.cost.fixedCostShare },
  ].filter(d => d.value > 0) : []

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/tours"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{tour.name}</h1>
            <p className="text-muted-foreground text-sm">{new Date(tour.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <Badge variant={st.variant}>{st.label}</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Chauffeur</p><p className="font-semibold">{tour.driver?.firstName} {tour.driver?.lastName}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Véhicule</p><p className="font-semibold">{tour.vehicle?.plate} — {tour.vehicle?.brand} {tour.vehicle?.model}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Distance</p><p className="font-semibold">{tour.distanceKm ? `${tour.distanceKm.toFixed(1)} km` : 'Non calculée'}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Durée</p><p className="font-semibold">{tour.durationMin ? `${Math.floor(tour.durationMin / 60)}h${(tour.durationMin % 60).toString().padStart(2, '0')}` : 'Non calculée'}</p></CardContent></Card>
        </div>

        {/* Stops */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Arrêts ({tour.stops?.length || 0})</CardTitle>
            <Button onClick={handleOptimize} isLoading={optimizing} variant="outline" size="sm">
              <Zap className="h-4 w-4 mr-2" />Optimiser le trajet
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Start point */}
            {tour.startAddress && (
              <div className="flex items-center gap-3 p-3 rounded-lg"
                style={{ border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.05)' }}>
                <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black"
                  style={{ background: '#22c55e' }}>D</span>
                <div className="flex-1">
                  <p className="font-medium text-sm" style={{ color: '#22c55e' }}>Point de départ</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{tour.startAddress}</p>
                </div>
              </div>
            )}
            {tour.stops?.length > 0 && (
              <TourMap stops={tour.stops} height="320px" startAddress={tour.startAddress} endAddress={tour.endAddress} />
            )}
            <div className="space-y-2">
              {tour.stops?.map((stop: any, i: number) => (
                <div key={stop.id} className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ border: '1px solid rgba(0,212,255,0.1)', background: 'rgba(0,212,255,0.03)' }}>
                  <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-black"
                    style={{ background: 'linear-gradient(135deg, #00d4ff, #0088ff)' }}>{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{stop.child?.firstName} {stop.child?.lastName}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{stop.address}</p>
                  </div>
                  {stop.scheduledTime && (
                    <p className="text-sm" style={{ color: '#a855f7' }}>
                      {new Date(stop.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {/* End point */}
            {tour.endAddress && (
              <div className="flex items-center gap-3 p-3 rounded-lg"
                style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
                <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: '#ef4444' }}>A</span>
                <div className="flex-1">
                  <p className="font-medium text-sm" style={{ color: '#ef4444' }}>Destination finale</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{tour.endAddress}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost breakdown */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Analyse des coûts</CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Péages (€)</Label>
                <Input type="number" value={tollCost} onChange={e => setTollCost(e.target.value)} className="w-24 h-8" />
              </div>
              <Button onClick={handleCalculateCost} isLoading={calculating} size="sm">Calculer les coûts</Button>
            </div>
          </CardHeader>
          <CardContent>
            {tour.cost ? (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  {[
                    { label: 'Carburant', value: tour.cost.fuelCost },
                    { label: 'Salaire chargé', value: tour.cost.salaryCost },
                    { label: 'Maintenance', value: tour.cost.maintenanceCost },
                    { label: 'Péages', value: tour.cost.tollCost },
                    { label: 'Frais fixes (part jours)', value: tour.cost.fixedCostShare },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground text-sm">{label}</span>
                      <span className="font-medium">{fmt(value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-bold">
                    <span>Coût total</span>
                    <span>{fmt(tour.cost.totalCost)}</span>
                  </div>
                  {tour.billedPrice && (
                    <div className="flex justify-between py-2">
                      <span>Prix facturé</span>
                      <span>{fmt(tour.billedPrice)}</span>
                    </div>
                  )}
                  {tour.cost.margin != null && (
                    <div className={`flex justify-between py-2 font-bold text-lg rounded-lg px-3 ${tour.cost.margin < 0 ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-700'}`}>
                      <span>Marge brute</span>
                      <span>{fmt(tour.cost.margin)}</span>
                    </div>
                  )}
                </div>
                {costData.length > 0 && (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={costData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                        {costData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Aucun coût calculé. Cliquez sur "Calculer les coûts" pour commencer.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
