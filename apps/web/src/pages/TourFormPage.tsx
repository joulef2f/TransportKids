import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AddressCombobox, AddressOption } from '@/components/AddressCombobox'
import { ArrowLeft, Plus, Trash2, AlertTriangle } from 'lucide-react'

const stopSchema = z.object({
  childId: z.string().min(1, 'Enfant requis'),
  address: z.string().min(1, 'Adresse requise'),
  sequenceOrder: z.number().int(),
  scheduledTime: z.string().optional(),
})

const tourSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  date: z.string().min(1, 'Date requise'),
  driverId: z.string().min(1, 'Chauffeur requis'),
  vehicleId: z.string().min(1, 'Véhicule requis'),
  type: z.enum(['ONE_WAY', 'ROUND_TRIP', 'MULTI']),
  billedPrice: z.coerce.number().optional(),
  startAddress: z.string().optional(),
  endAddress: z.string().optional(),
  stops: z.array(stopSchema).min(1, 'Minimum 1 arrêt'),
})
type TourFormType = z.infer<typeof tourSchema>

export function TourFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const [drivers, setDrivers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [allChildren, setAllChildren] = useState<any[]>([])
  const [allClients, setAllClients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEdit)
  const [conflicts, setConflicts] = useState<any[]>([])

  const { register, handleSubmit, setValue, watch, control, reset, formState: { errors } } = useForm<TourFormType>({
    resolver: zodResolver(tourSchema),
    defaultValues: { type: 'ONE_WAY', stops: [] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'stops' })

  useEffect(() => {
    Promise.all([
      api.drivers.list(),
      api.vehicles.list(),
      api.clients.list().then(async (clients: any[]) => {
        setAllClients(clients)
        const childrenArrays = await Promise.all(clients.map((c: any) => api.clients.children(c.id)))
        return childrenArrays.flat()
      }),
    ]).then(([d, v, ch]) => {
      setDrivers(d); setVehicles(v); setAllChildren(ch)
    })
  }, [])

  useEffect(() => {
    if (!isEdit) return
    api.tours.get(id!).then((tour: any) => {
      reset({
        name: tour.name,
        date: new Date(tour.date).toISOString().split('T')[0],
        driverId: tour.driverId,
        vehicleId: tour.vehicleId,
        type: tour.type,
        billedPrice: tour.billedPrice ?? undefined,
        startAddress: tour.startAddress ?? '',
        endAddress: tour.endAddress ?? '',
        stops: (tour.stops || []).map((s: any) => ({
          childId: s.childId,
          address: s.address,
          sequenceOrder: s.sequenceOrder,
          scheduledTime: s.scheduledTime
            ? new Date(s.scheduledTime).toISOString().slice(11, 16)
            : undefined,
        })),
      })
      setInitialLoading(false)
    })
  }, [id, isEdit])

  // Build address options for combobox (clients + children pickup + children school)
  const addressOptions: AddressOption[] = [
    ...allClients.map(c => ({
      label: c.name,
      sublabel: c.type,
      address: c.address,
      type: 'client' as const,
    })),
    ...allChildren.map(c => ({
      label: `${c.firstName} ${c.lastName}`,
      sublabel: 'Adresse de ramassage',
      address: c.pickupAddress,
      type: 'child-pickup' as const,
    })),
    ...allChildren.map(c => ({
      label: `${c.firstName} ${c.lastName}`,
      sublabel: 'Établissement scolaire',
      address: c.schoolAddress,
      type: 'child-school' as const,
    })),
  ]

  const onSubmit = async (data: TourFormType) => {
    setLoading(true)
    try {
      const stopsWithOrder = data.stops.map((s, i) => ({ ...s, sequenceOrder: i }))
      if (isEdit) {
        await api.tours.update(id!, { ...data, stops: stopsWithOrder })
        toast.success('Tournée mise à jour')
        navigate(`/tours/${id}`)
      } else {
        const res = await api.tours.create({ ...data, stops: stopsWithOrder })
        toast.success('Tournée créée')
        navigate(`/tours/${res.id}`)
      }
    } catch (err: any) {
      if (err.status === 409 && err.body?.conflicts) {
        setConflicts(err.body.conflicts)
        toast.error('Conflits de planning détectés')
      } else {
        toast.error(err.body?.error || 'Erreur')
      }
    } finally { setLoading(false) }
  }

  const typeLabels: Record<string, string> = { ONE_WAY: 'Aller simple', ROUND_TRIP: 'Aller-retour', MULTI: 'Multi-arrêts' }

  if (initialLoading) return <Layout><div className="p-6 text-muted-foreground">Chargement...</div></Layout>

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="flex items-center gap-4">
          <Link to={isEdit ? `/tours/${id}` : '/tours'}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-2xl font-bold">{isEdit ? 'Modifier la tournée' : 'Nouvelle tournée'}</h1>
        </div>

        {conflicts.length > 0 && (
          <div className="border border-destructive bg-destructive/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="font-semibold text-destructive">Conflits de planning</p>
            </div>
            <ul className="space-y-1">
              {conflicts.map((c: any, i: number) => (
                <li key={i} className="text-sm">
                  Conflit {c.type === 'driver' ? 'chauffeur' : 'véhicule'} avec{' '}
                  <Link to={`/tours/${c.tourId}`} className="text-primary underline">{c.tourName}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nom de la tournée</Label>
                <Input {...register('name')} placeholder="Ex: Circuit École Jules Ferry" />
                {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" {...register('date')} />
                {errors.date && <p className="text-destructive text-xs">{errors.date.message}</p>}
              </div>
              <div>
                <Label>Type</Label>
                <Select value={watch('type')} onValueChange={v => setValue('type', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chauffeur</Label>
                <Select value={watch('driverId') || ''} onValueChange={v => setValue('driverId', v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {drivers.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.firstName} {d.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.driverId && <p className="text-destructive text-xs">{errors.driverId.message}</p>}
              </div>
              <div>
                <Label>Véhicule</Label>
                <Select value={watch('vehicleId') || ''} onValueChange={v => setValue('vehicleId', v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model} ({v.capacity} places)</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.vehicleId && <p className="text-destructive text-xs">{errors.vehicleId.message}</p>}
              </div>
              <div>
                <Label>Prix facturé (€)</Label>
                <Input type="number" step="0.01" {...register('billedPrice')} placeholder="Optionnel" />
              </div>

              {/* Départ / Arrivée avec combobox */}
              <div className="col-span-2" style={{ borderTop: '1px solid rgba(0,212,255,0.1)', paddingTop: '12px', marginTop: '4px' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(0,212,255,0.6)' }}>
                  Points de départ et d'arrivée
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1.5 mb-1">
                      <span className="w-4 h-4 rounded-full inline-flex items-center justify-center text-xs font-bold text-black" style={{ background: '#22c55e', minWidth: 16 }}>D</span>
                      Adresse de départ
                    </Label>
                    <AddressCombobox
                      value={watch('startAddress') || ''}
                      onChange={v => setValue('startAddress', v)}
                      options={addressOptions}
                      placeholder="Client, personne ou adresse libre..."
                    />
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Auto-rempli depuis le 1er arrêt
                    </p>
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5 mb-1">
                      <span className="w-4 h-4 rounded-full inline-flex items-center justify-center text-xs font-bold text-white" style={{ background: '#ef4444', minWidth: 16 }}>A</span>
                      Destination finale
                    </Label>
                    <AddressCombobox
                      value={watch('endAddress') || ''}
                      onChange={v => setValue('endAddress', v)}
                      options={addressOptions}
                      placeholder="Client, personne ou adresse libre..."
                    />
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Auto-rempli depuis le dernier arrêt
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Arrêts</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ childId: '', address: '', sequenceOrder: fields.length })}>
                <Plus className="h-4 w-4 mr-2" />Ajouter un arrêt
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {errors.stops && typeof errors.stops.message === 'string' && (
                <p className="text-destructive text-sm">{errors.stops.message}</p>
              )}
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-start border rounded-lg p-3">
                  <div className="col-span-1 flex items-center justify-center mt-8">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{index + 1}</span>
                  </div>
                  <div className="col-span-4">
                    <Label>Enfant</Label>
                    <Select value={watch(`stops.${index}.childId`) || ''} onValueChange={v => {
                      setValue(`stops.${index}.childId`, v)
                      const child = allChildren.find((c: any) => c.id === v)
                      if (child) {
                        // Auto-remplir l'adresse de l'arrêt
                        setValue(`stops.${index}.address`, child.pickupAddress)
                        // Premier arrêt → point de départ
                        if (index === 0) setValue('startAddress', child.pickupAddress)
                        // Dernier arrêt → destination finale (école)
                        if (index === fields.length - 1) setValue('endAddress', child.schoolAddress)
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent>
                        {allChildren.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.stops?.[index]?.childId && <p className="text-destructive text-xs">{errors.stops[index]?.childId?.message}</p>}
                  </div>
                  <div className="col-span-5">
                    <Label>Adresse de ramassage</Label>
                    <Input {...register(`stops.${index}.address`)} placeholder="Adresse de l'arrêt" />
                    {errors.stops?.[index]?.address && <p className="text-destructive text-xs">{errors.stops[index]?.address?.message}</p>}
                  </div>
                  <div className="col-span-1">
                    <Label>Heure</Label>
                    <Input type="time" {...register(`stops.${index}.scheduledTime`)} />
                  </div>
                  <div className="col-span-1 flex items-end">
                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {fields.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Aucun arrêt. Cliquez sur "Ajouter un arrêt" pour commencer.</p>}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(isEdit ? `/tours/${id}` : '/tours')}>Annuler</Button>
            <Button type="submit" isLoading={loading}>{isEdit ? 'Enregistrer les modifications' : 'Créer la tournée'}</Button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
