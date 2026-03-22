import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Eye, Pencil } from 'lucide-react'

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'secondary' | 'destructive' | 'warning' | 'outline' }> = {
  PLANNED: { label: 'Planifiée', variant: 'default' },
  IN_PROGRESS: { label: 'En cours', variant: 'success' },
  DONE: { label: 'Terminée', variant: 'secondary' },
  CANCELLED: { label: 'Annulée', variant: 'destructive' },
}

export function ToursPage() {
  const [tours, setTours] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (filterStatus) params.status = filterStatus
    if (filterDate) { params.from = filterDate; params.to = filterDate }
    api.tours.list(params).then(setTours).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterStatus, filterDate])

  const handleDelete = async (id: string) => {
    try { await api.tours.delete(id); toast.success('Tournée supprimée'); load() }
    catch (err: any) { toast.error(err.body?.error || 'Erreur') }
  }

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tournées</h1>
          <Button onClick={() => navigate('/tours/new')}><Plus className="h-4 w-4 mr-2" />Nouvelle tournée</Button>
        </div>

        <div className="flex gap-4">
          <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-48" placeholder="Filtrer par date" />
          <Select value={filterStatus || 'ALL'} onValueChange={v => setFilterStatus(v === 'ALL' ? '' : v)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {Object.entries(statusConfig).map(([v, { label }]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filterStatus || filterDate) && (
            <Button variant="outline" onClick={() => { setFilterStatus(''); setFilterDate('') }}>Réinitialiser</Button>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tournée</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Chauffeur</TableHead>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Prix facturé</TableHead>
                    <TableHead>Marge</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tours.map((t: any) => {
                    const st = statusConfig[t.status] || statusConfig.PLANNED
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">
                          <Link to={`/tours/${t.id}`} className="text-primary hover:underline">{t.name}</Link>
                        </TableCell>
                        <TableCell>{new Date(t.date).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell>{t.driver?.firstName} {t.driver?.lastName}</TableCell>
                        <TableCell>{t.vehicle?.plate}</TableCell>
                        <TableCell>{t.distanceKm ? `${t.distanceKm.toFixed(1)} km` : '-'}</TableCell>
                        <TableCell>{t.billedPrice ? fmt(t.billedPrice) : '-'}</TableCell>
                        <TableCell>
                          {t.cost?.margin != null ? (
                            <span className={t.cost.margin < 0 ? 'text-destructive font-semibold' : 'text-green-600 font-semibold'}>
                              {fmt(t.cost.margin)}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Link to={`/tours/${t.id}`}><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></Link>
                            <Link to={`/tours/${t.id}/edit`}><Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button></Link>
                            <ConfirmDialog
                              trigger={<Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                              title="Supprimer cette tournée ?" description="Cette action est irréversible."
                              onConfirm={() => handleDelete(t.id)} destructive
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
