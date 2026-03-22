import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Plus, Trash2, Pencil } from 'lucide-react'

const childSchema = z.object({
  firstName: z.string().min(1, 'Requis'),
  lastName: z.string().min(1, 'Requis'),
  pickupAddress: z.string().min(1, 'Requis'),
  schoolAddress: z.string().min(1, 'Requis'),
  notes: z.string().optional(),
})
type ChildForm = z.infer<typeof childSchema>

function ChildFormDialog({ child, clientId, onSave }: { child?: any; clientId: string; onSave: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChildForm>({
    resolver: zodResolver(childSchema),
    defaultValues: child ? {
      firstName: child.firstName,
      lastName: child.lastName,
      pickupAddress: child.pickupAddress,
      schoolAddress: child.schoolAddress,
      notes: child.notes || '',
    } : {},
  })

  const onSubmit = async (data: ChildForm) => {
    setLoading(true)
    try {
      if (child) {
        await api.children.update(child.id, data)
        toast.success('Enfant mis à jour')
      } else {
        await api.children.create({ ...data, clientId })
        toast.success('Enfant ajouté')
      }
      onSave(); setOpen(false); reset()
    } catch (err: any) {
      toast.error(err.body?.error || 'Erreur')
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {child
          ? <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
          : <Button size="sm"><Plus className="h-4 w-4 mr-2" />Ajouter un enfant</Button>
        }
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{child ? 'Modifier l\'enfant' : 'Nouvel enfant'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <Label>Adresse de l'école</Label>
            <Input {...register('schoolAddress')} />
            {errors.schoolAddress && <p className="text-destructive text-xs">{errors.schoolAddress.message}</p>}
          </div>
          <div>
            <Label>Notes</Label>
            <Input {...register('notes')} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" isLoading={loading}>{child ? 'Enregistrer' : 'Ajouter'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!id) return
    setLoading(true)
    const [c, ch] = await Promise.all([api.clients.get(id), api.clients.children(id)])
    setClient(c); setChildren(ch)
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  const handleDeleteChild = async (childId: string) => {
    try { await api.children.delete(childId); toast.success('Enfant supprimé'); load() }
    catch (err: any) { toast.error(err.body?.error || 'Erreur') }
  }

  if (loading) return <Layout><div className="p-6 space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div></Layout>
  if (!client) return <Layout><div className="p-6">Client introuvable</div></Layout>

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/clients"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold">{client.name}</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Type', value: client.type },
            { label: 'Adresse', value: client.address },
            { label: 'Email', value: client.contactEmail || '-' },
            { label: 'Téléphone', value: client.contactPhone || '-' },
          ].map(({ label, value }) => (
            <Card key={label}><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold mt-1">{value}</p></CardContent></Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Enfants ({children.length})</CardTitle>
            <ChildFormDialog clientId={id!} onSave={load} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Adresse ramassage</TableHead>
                  <TableHead>École</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {children.map((ch: any) => (
                  <TableRow key={ch.id}>
                    <TableCell className="font-medium">{ch.firstName} {ch.lastName}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{ch.pickupAddress}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{ch.schoolAddress}</TableCell>
                    <TableCell>{ch.notes || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <ChildFormDialog child={ch} clientId={id!} onSave={load} />
                        <ConfirmDialog
                          trigger={<Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                          title="Supprimer cet enfant ?" description="Cette action est irréversible."
                          onConfirm={() => handleDeleteChild(ch.id)} destructive
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
