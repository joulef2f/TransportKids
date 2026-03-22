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
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const driverSchema = z.object({
  firstName: z.string().min(1, 'Requis'),
  lastName: z.string().min(1, 'Requis'),
  phone: z.string().min(1, 'Requis'),
  licenseNum: z.string().min(1, 'Requis'),
  licenseExpiry: z.string().optional(),
  hourlyRate: z.coerce.number().positive('Requis'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})
type DriverForm = z.infer<typeof driverSchema>

function DriverFormDialog({ driver, onSave }: { driver?: any; onSave: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<DriverForm>({
    resolver: zodResolver(driverSchema),
    defaultValues: driver ? {
      ...driver,
      licenseExpiry: driver.licenseExpiry ? driver.licenseExpiry.split('T')[0] : '',
    } : { status: 'ACTIVE' },
  })

  const onSubmit = async (data: DriverForm) => {
    setLoading(true)
    try {
      if (driver) {
        await api.drivers.update(driver.id, data)
        toast.success('Chauffeur mis à jour')
      } else {
        await api.drivers.create(data)
        toast.success('Chauffeur créé')
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
        {driver ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button><Plus className="h-4 w-4 mr-2" />Ajouter un chauffeur</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{driver ? 'Modifier le chauffeur' : 'Nouveau chauffeur'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
          <div>
            <Label>Prénom</Label>
            <Input {...register('firstName')} />
            {errors.firstName && <p className="text-destructive text-xs">{errors.firstName.message}</p>}
          </div>
          <div>
            <Label>Nom</Label>
            <Input {...register('lastName')} />
            {errors.lastName && <p className="text-destructive text-xs">{errors.lastName.message}</p>}
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input {...register('phone')} />
            {errors.phone && <p className="text-destructive text-xs">{errors.phone.message}</p>}
          </div>
          <div>
            <Label>N° de permis</Label>
            <Input {...register('licenseNum')} />
            {errors.licenseNum && <p className="text-destructive text-xs">{errors.licenseNum.message}</p>}
          </div>
          <div>
            <Label>Expiration permis</Label>
            <Input type="date" {...register('licenseExpiry')} />
          </div>
          <div>
            <Label>Taux horaire brut (€)</Label>
            <Input type="number" step="0.01" {...register('hourlyRate')} />
            {errors.hourlyRate && <p className="text-destructive text-xs">{errors.hourlyRate.message}</p>}
          </div>
          <div>
            <Label>Statut</Label>
            <Select defaultValue={driver?.status || 'ACTIVE'} onValueChange={v => setValue('status', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Actif</SelectItem>
                <SelectItem value="INACTIVE">Inactif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" isLoading={loading}>{driver ? 'Mettre à jour' : 'Créer'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.drivers.list().then(setDrivers).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    try {
      await api.drivers.delete(id)
      toast.success('Chauffeur supprimé')
      load()
    } catch (err: any) {
      toast.error(err.body?.error || 'Erreur')
    }
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Chauffeurs</h1>
          <DriverFormDialog onSave={load} />
        </div>
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>N° permis</TableHead>
                    <TableHead>Taux horaire</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Link to={`/drivers/${d.id}`} className="text-primary hover:underline font-medium">
                          {d.firstName} {d.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>{d.phone}</TableCell>
                      <TableCell>{d.licenseNum}</TableCell>
                      <TableCell>{d.hourlyRate.toFixed(2)} €/h</TableCell>
                      <TableCell>
                        <Badge variant={d.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {d.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DriverFormDialog driver={d} onSave={load} />
                          <ConfirmDialog
                            trigger={<Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                            title="Supprimer ce chauffeur ?"
                            description="Cette action est irréversible."
                            onConfirm={() => handleDelete(d.id)}
                            destructive
                          />
                        </div>
                      </TableCell>
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
