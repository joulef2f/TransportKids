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

const clientSchema = z.object({
  name: z.string().min(1, 'Requis'),
  type: z.enum(['SCHOOL', 'MDPH', 'CPAM', 'ARS', 'PRIVATE', 'OTHER']),
  address: z.string().min(1, 'Requis'),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
})
type ClientForm = z.infer<typeof clientSchema>

const typeLabels: Record<string, string> = {
  SCHOOL: 'École', MDPH: 'MDPH', CPAM: 'CPAM', ARS: 'ARS', PRIVATE: 'Privé', OTHER: 'Autre'
}

function ClientFormDialog({ client, onSave }: { client?: any; onSave: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: client || { type: 'SCHOOL' },
  })

  const onSubmit = async (data: ClientForm) => {
    setLoading(true)
    try {
      if (client) {
        await api.clients.update(client.id, data)
        toast.success('Client mis à jour')
      } else {
        await api.clients.create(data)
        toast.success('Client créé')
      }
      onSave(); setOpen(false); reset()
    } catch (err: any) {
      toast.error(err.body?.error || 'Erreur')
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {client ? <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
          : <Button><Plus className="h-4 w-4 mr-2" />Ajouter un client</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{client ? 'Modifier le client' : 'Nouveau client'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Nom</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div>
            <Label>Type</Label>
            <Select defaultValue={client?.type || 'SCHOOL'} onValueChange={v => setValue('type', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Adresse</Label>
            <Input {...register('address')} />
            {errors.address && <p className="text-destructive text-xs">{errors.address.message}</p>}
          </div>
          <div>
            <Label>Email contact</Label>
            <Input type="email" {...register('contactEmail')} />
          </div>
          <div>
            <Label>Téléphone contact</Label>
            <Input {...register('contactPhone')} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" isLoading={loading}>{client ? 'Mettre à jour' : 'Créer'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => { setLoading(true); api.clients.list().then(setClients).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    try { await api.clients.delete(id); toast.success('Client supprimé'); load() }
    catch (err: any) { toast.error(err.body?.error || 'Erreur') }
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Clients</h1>
          <ClientFormDialog onSave={load} />
        </div>
        <Card>
          <CardContent className="pt-6">
            {loading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link to={`/clients/${c.id}`} className="text-primary hover:underline font-medium">{c.name}</Link>
                      </TableCell>
                      <TableCell><Badge variant="outline">{typeLabels[c.type] || c.type}</Badge></TableCell>
                      <TableCell className="max-w-xs truncate">{c.address}</TableCell>
                      <TableCell>{c.contactEmail || c.contactPhone || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <ClientFormDialog client={c} onSave={load} />
                          <ConfirmDialog
                            trigger={<Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                            title="Supprimer ce client ?" description="Cette action est irréversible."
                            onConfirm={() => handleDelete(c.id)} destructive
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
