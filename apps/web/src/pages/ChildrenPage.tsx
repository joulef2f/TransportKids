import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Users, Search, MapPin, School, Plus, Pencil, Trash2 } from 'lucide-react'

const childSchema = z.object({
  clientId: z.string().min(1, 'Client requis'),
  firstName: z.string().min(1, 'Requis'),
  lastName: z.string().min(1, 'Requis'),
  pickupAddress: z.string().min(1, 'Requis'),
  schoolAddress: z.string().min(1, 'Requis'),
  notes: z.string().optional(),
})
type ChildForm = z.infer<typeof childSchema>

const typeLabels: Record<string, string> = {
  SCHOOL: 'École', MDPH: 'MDPH', CPAM: 'CPAM', ARS: 'ARS', PRIVATE: 'Privé', OTHER: 'Autre'
}

interface Child {
  id: string
  firstName: string
  lastName: string
  pickupAddress: string
  schoolAddress: string
  notes?: string | null
  clientId: string
  client?: { id: string; name: string; type: string }
}

export function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChild, setEditingChild] = useState<Child | null>(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ChildForm>({
    resolver: zodResolver(childSchema),
    defaultValues: { clientId: '' },
  })

  const load = async () => {
    setLoading(true)
    const cls = await api.clients.list()
    setClients(cls)
    const arrays = await Promise.all(
      cls.map((c: any) =>
        api.clients.children(c.id).then((ch: any[]) =>
          ch.map(child => ({ ...child, client: { id: c.id, name: c.name, type: c.type } }))
        )
      )
    )
    setChildren(arrays.flat())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditingChild(null)
    reset({ clientId: '', firstName: '', lastName: '', pickupAddress: '', schoolAddress: '', notes: '' })
    setDialogOpen(true)
  }

  const openEdit = (child: Child) => {
    setEditingChild(child)
    reset({
      clientId: child.clientId || child.client?.id || '',
      firstName: child.firstName,
      lastName: child.lastName,
      pickupAddress: child.pickupAddress,
      schoolAddress: child.schoolAddress,
      notes: child.notes || '',
    })
    setDialogOpen(true)
  }

  const onSubmit = async (data: ChildForm) => {
    setSaving(true)
    try {
      if (editingChild) {
        await api.children.update(editingChild.id, data)
        toast.success('Personne mise à jour')
      } else {
        await api.children.create(data)
        toast.success('Personne ajoutée')
      }
      setDialogOpen(false)
      load()
    } catch (err: any) {
      toast.error(err.body?.error || 'Erreur')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.children.delete(id)
      toast.success('Personne supprimée')
      load()
    } catch (err: any) {
      toast.error(err.body?.error || 'Erreur')
    }
  }

  const filtered = children.filter(c =>
    search === '' ||
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    c.client?.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(168,85,247,0.15))', border: '1px solid rgba(0,212,255,0.2)' }}>
              <Users className="h-5 w-5" style={{ color: '#00d4ff' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Personnes transportées</h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{children.length} enfants enregistrés</p>
            </div>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Ajouter une personne</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <Input className="pl-9" placeholder="Rechercher un enfant ou client..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
                <p style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {search ? 'Aucun résultat pour cette recherche' : 'Aucun enfant enregistré'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Client / Organisme</TableHead>
                    <TableHead>Adresse de ramassage</TableHead>
                    <TableHead>Établissement</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((child) => (
                    <TableRow key={child.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #00d4ff, #0088ff)' }}>
                            {child.firstName[0]}{child.lastName[0]}
                          </div>
                          <p className="font-semibold text-sm">{child.firstName} {child.lastName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link to={`/clients/${child.client?.id}`} className="hover:underline">
                          <span style={{ color: '#00d4ff' }}>{child.client?.name}</span>
                        </Link>
                        <Badge variant="outline" className="ml-1 text-xs">
                          {typeLabels[child.client?.type || ''] || child.client?.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-1.5 max-w-[200px]">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: '#a855f7' }} />
                          <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{child.pickupAddress}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-1.5 max-w-[200px]">
                          <School className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: '#22c55e' }} />
                          <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{child.schoolAddress}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {child.notes ? (
                          <span className="text-xs px-2 py-1 rounded-md" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                            {child.notes}
                          </span>
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(child)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ConfirmDialog
                            trigger={<Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                            title="Supprimer cette personne ?" description="Cette action est irréversible."
                            onConfirm={() => handleDelete(child.id)} destructive
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingChild ? 'Modifier la personne' : 'Ajouter une personne transportée'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>Client / Organisme</Label>
                <Select value={watch('clientId')} onValueChange={v => setValue('clientId', v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} ({typeLabels[c.type] || c.type})</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.clientId && <p className="text-destructive text-xs">{errors.clientId.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div>
                <Label>Adresse de ramassage</Label>
                <Input {...register('pickupAddress')} />
                {errors.pickupAddress && <p className="text-destructive text-xs">{errors.pickupAddress.message}</p>}
              </div>
              <div>
                <Label>Adresse de l'école / établissement</Label>
                <Input {...register('schoolAddress')} />
                {errors.schoolAddress && <p className="text-destructive text-xs">{errors.schoolAddress.message}</p>}
              </div>
              <div>
                <Label>Notes</Label>
                <Input {...register('notes')} placeholder="Optionnel" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                <Button type="submit" isLoading={saving}>{editingChild ? 'Enregistrer' : 'Ajouter'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}
