import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [vehicle, setVehicle] = useState<any>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.vehicles.get(id),
      api.vehicles.alerts(id),
    ]).then(([v, a]) => {
      setVehicle(v)
      setAlerts(a)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <Layout><div className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div></Layout>
  if (!vehicle) return <Layout><div className="p-6">Véhicule introuvable</div></Layout>

  const fuelLabels: Record<string, string> = { DIESEL: 'Diesel', PETROL: 'Essence', ELECTRIC: 'Électrique', HYBRID: 'Hybride' }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/vehicles"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold">{vehicle.plate} — {vehicle.brand} {vehicle.model}</h1>
        </div>

        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert: any, i: number) => (
              <div key={i} className={`flex items-center gap-3 p-4 rounded-lg border ${alert.severity === 'critical' ? 'border-destructive bg-destructive/10' : 'border-yellow-500 bg-yellow-50'}`}>
                <AlertTriangle className={`h-5 w-5 ${alert.severity === 'critical' ? 'text-destructive' : 'text-yellow-600'}`} />
                <p className="text-sm font-medium">{alert.message}</p>
                <Badge variant={alert.severity === 'critical' ? 'destructive' : 'warning'}>{alert.type}</Badge>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Immatriculation', value: vehicle.plate },
            { label: 'Marque', value: vehicle.brand },
            { label: 'Modèle', value: vehicle.model },
            { label: 'Capacité', value: `${vehicle.capacity} places` },
            { label: 'Carburant', value: fuelLabels[vehicle.fuelType] || vehicle.fuelType },
            { label: 'Consommation', value: `${vehicle.consumptionL100} L/100km` },
            { label: 'Km totaux', value: `${vehicle.kmTotal.toLocaleString('fr-FR')} km` },
            { label: 'Prochain entretien', value: vehicle.nextServiceKm ? `${vehicle.nextServiceKm.toLocaleString('fr-FR')} km` : 'Non défini' },
            { label: 'Assurance expire', value: vehicle.insuranceExpiry ? new Date(vehicle.insuranceExpiry).toLocaleDateString('fr-FR') : 'Non défini' },
            { label: 'CT expire', value: vehicle.controlExpiry ? new Date(vehicle.controlExpiry).toLocaleDateString('fr-FR') : 'Non défini' },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-semibold mt-1">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  )
}
