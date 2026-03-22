import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Plus, AlertTriangle, Pencil, Trash2 } from 'lucide-react'

const vehicleSchema = z.object({
  plate: z.string().min(1, 'Requis'),
  brand: z.string().min(1, 'Requis'),
  model: z.string().min(1, 'Requis'),
  capacity: z.coerce.number().int().positive('Requis'),
  fuelType: z.enum(['DIESEL', 'PETROL', 'ELECTRIC', 'HYBRID']),
  consumptionL100: z.coerce.number().positive('Requis'),
  kmTotal: z.coerce.number().int().default(0),
  nextServiceKm: z.coerce.number().int().optional(),
  insuranceExpiry: z.string().optional(),
  controlExpiry: z.string().optional(),
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE']).default('AVAILABLE'),
})
type VehicleForm = z.infer<typeof vehicleSchema>

const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  AVAILABLE: { label: 'Disponible', variant: 'success' },
  MAINTENANCE: { label: 'Maintenance', variant: 'warning' },
  UNAVAILABLE: { label: 'Indisponible', variant: 'destructive' },
}

function VehicleFormDialog({ vehicle, onSave }: { vehicle?: any; onSave: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: vehicle ? {
      ...vehicle,
      insuranceExpiry: vehicle.insuranceExpiry ? vehicle.insuranceExpiry.split('T')[0] : '',
      controlExpiry: vehicle.controlExpiry ? vehicle.controlExpiry.split('T')[0] : '',
    } : { status: 'AVAILABLE', fuelType: 'DIESEL', kmTotal: 0 },
  })

  const onSubmit = async (data: VehicleForm) => {
    setLoading(true)
    try {
      if (vehicle) {
        await api.vehicles.update(vehicle.id, data)
        toast.success('Véhicule mis à jour')
      } else {
        await api.vehicles.create(data)
        toast.success('Véhicule créé')
      }
      onSave()
      setOpen(false)
      reset()
    } catch (err: any) {
      toast.error(err.body?.error || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {vehicle ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button><Plus className="h-4 w-4 mr-2" />Ajouter un véhicule</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{vehicle ? 'Modifier le véhicule' : 'Nouveau véhicule'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
          <div>
            <Label>Immatriculation</Label>
            <Input {...register('plate')} />
            {errors.plate && <p className="text-destructive text-xs">{errors.plate.message}</p>}
          </div>
          <div>
            <Label>Marque</Label>
            <Input {...register('brand')} />
            {errors.brand && <p className="text-destructive text-xs">{errors.brand.message}</p>}
          </div>
          <div>
            <Label>Modèle</Label>
            <Input {...register('model')} />
            {errors.model && <p className="text-destructive text-xs">{errors.model.message}</p>}
          </div>
          <div>
            <Label>Capacité (places)</Label>
            <Input type="number" {...register('capacity')} />
            {errors.capacity && <p className="text-destructive text-xs">{errors.capacity.message}</p>}
          </div>
          <div>
            <Label>Carburant</Label>
            <Select defaultValue={vehicle?.fuelType || 'DIESEL'} onValueChange={v => setValue('fuelType', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DIESEL">Diesel</SelectItem>
                <SelectItem value="PETROL">Essence</SelectItem>
                <SelectItem value="ELECTRIC">Électrique</SelectItem>
                <SelectItem value="HYBRID">Hybride</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Consommation (L/100km)</Label>
            <Input type="number" step="0.1" {...register('consumptionL100')} />
            {errors.consumptionL100 && <p className="text-destructive text-xs">{errors.consumptionL100.message}</p>}
          </div>
          <div>
            <Label>Km totaux</Label>
            <Input type="number" {...register('kmTotal')} />
          </div>
          <div>
            <Label>Km prochain entretien</Label>
            <Input type="number" {...register('nextServiceKm')} />
          </div>
          <div>
            <Label>Expiration assurance</Label>
            <Input type="date" {...register('insuranceExpiry')} />
          </div>
          <div>
            <Label>Expiration contrôle technique</Label>
            <Input type="date" {...register('controlExpiry')} />
          </div>
          <div>
            <Label>Statut</Label>
            <Select defaultValue={vehicle?.status || 'AVAILABLE'} onValueChange={v => setValue('status', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AVAILABLE">Disponible</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="UNAVAILABLE">Indisponible</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" isLoading={loading}>{vehicle ? 'Mettre à jour' : 'Créer'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.vehicles.list().then(setVehicles).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    try {
      await api.vehicles.delete(id)
      toast.success('Véhicule supprimé')
      load()
    } catch (err: any) {
      toast.error(err.body?.error || 'Erreur lors de la suppression')
    }
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Véhicules</h1>
          <VehicleFormDialog onSave={load} />
        </div>
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Immatriculation</TableHead>
                    <TableHead>Marque / Modèle</TableHead>
                    <TableHead>Capacité</TableHead>
                    <TableHead>Carburant</TableHead>
                    <TableHead>Km totaux</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((v: any) => {
                    const st = statusLabels[v.status] || statusLabels.AVAILABLE
                    return (
                      <TableRow key={v.id}>
                        <TableCell>
                          <Link to={`/vehicles/${v.id}`} className="text-primary hover:underline font-medium">{v.plate}</Link>
                        </TableCell>
                        <TableCell>{v.brand} {v.model}</TableCell>
                        <TableCell>{v.capacity} places</TableCell>
                        <TableCell>{v.fuelType}</TableCell>
                        <TableCell>{v.kmTotal.toLocaleString('fr-FR')} km</TableCell>
                        <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Link to={`/vehicles/${v.id}`}>
                              <Button variant="ghost" size="icon"><AlertTriangle className="h-4 w-4" /></Button>
                            </Link>
                            <VehicleFormDialog vehicle={v} onSave={load} />
                            <ConfirmDialog
                              trigger={<Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                              title="Supprimer ce véhicule ?"
                              description="Cette action est irréversible."
                              onConfirm={() => handleDelete(v.id)}
                              destructive
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
