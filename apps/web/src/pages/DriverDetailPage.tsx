import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft } from 'lucide-react'

export function DriverDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [driver, setDriver] = useState<any>(null)
  const [schedule, setSchedule] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
    Promise.all([api.drivers.get(id), api.drivers.schedule(id, from, to)]).then(([d, s]) => {
      setDriver(d); setSchedule(s)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <Layout><div className="p-6 space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div></Layout>
  if (!driver) return <Layout><div className="p-6">Chauffeur introuvable</div></Layout>

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/drivers"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold">{driver.firstName} {driver.lastName}</h1>
          <Badge variant={driver.status === 'ACTIVE' ? 'success' : 'secondary'}>{driver.status === 'ACTIVE' ? 'Actif' : 'Inactif'}</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Téléphone', value: driver.phone },
            { label: 'N° de permis', value: driver.licenseNum },
            { label: 'Expiration permis', value: driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString('fr-FR') : 'Non défini' },
            { label: 'Taux horaire', value: `${driver.hourlyRate.toFixed(2)} €/h` },
          ].map(({ label, value }) => (
            <Card key={label}><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold mt-1">{value}</p></CardContent></Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>Planning du mois</CardTitle></CardHeader>
          <CardContent>
            {schedule.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucune tournée ce mois</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Tournée</TableHead>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Arrêts</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell>{new Date(t.date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell><Link to={`/tours/${t.id}`} className="text-primary hover:underline">{t.name}</Link></TableCell>
                      <TableCell>{t.vehicle?.plate}</TableCell>
                      <TableCell>{t.stops?.length || 0}</TableCell>
                      <TableCell><Badge variant="outline">{t.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
