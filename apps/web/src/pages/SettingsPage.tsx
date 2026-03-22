import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

const settingsSchema = z.object({
  fuelPricePerLiter: z.coerce.number().positive('Requis'),
  chargeRate: z.coerce.number().min(0, 'Requis'),
  maintenanceCostPerKm: z.coerce.number().min(0, 'Requis'),
  fixedMonthlyFees: z.coerce.number().min(0, 'Requis'),
})
type SettingsForm = z.infer<typeof settingsSchema>

export function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companyName, setCompanyName] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
  })

  useEffect(() => {
    api.company.settings().then((data: any) => {
      setCompanyName(data.name)
      reset(data.costSettings)
      setLoading(false)
    })
  }, [])

  const onSubmit = async (data: SettingsForm) => {
    setSaving(true)
    try {
      await api.company.updateSettings(data)
      toast.success('Paramètres sauvegardés')
    } catch (err: any) {
      toast.error(err.body?.error || 'Erreur')
    } finally { setSaving(false) }
  }

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold">Paramètres</h1>

        <Card>
          <CardHeader>
            <CardTitle>Société</CardTitle>
            <CardDescription>{companyName}</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paramètres de coûts</CardTitle>
            <CardDescription>Ces valeurs sont utilisées pour le calcul automatique des coûts de tournées</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48" /> : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prix du carburant (€/L)</Label>
                    <Input type="number" step="0.01" {...register('fuelPricePerLiter')} />
                    {errors.fuelPricePerLiter && <p className="text-destructive text-xs">{errors.fuelPricePerLiter.message}</p>}
                  </div>
                  <div>
                    <Label>Taux de charges (%)</Label>
                    <Input type="number" step="0.1" {...register('chargeRate')} />
                    {errors.chargeRate && <p className="text-destructive text-xs">{errors.chargeRate.message}</p>}
                  </div>
                  <div>
                    <Label>Coût maintenance (€/km)</Label>
                    <Input type="number" step="0.001" {...register('maintenanceCostPerKm')} />
                    {errors.maintenanceCostPerKm && <p className="text-destructive text-xs">{errors.maintenanceCostPerKm.message}</p>}
                  </div>
                  <div>
                    <Label>Frais fixes mensuels (€)</Label>
                    <Input type="number" step="1" {...register('fixedMonthlyFees')} />
                    {errors.fixedMonthlyFees && <p className="text-destructive text-xs">{errors.fixedMonthlyFees.message}</p>}
                  </div>
                </div>
                <Button type="submit" isLoading={saving}>Sauvegarder</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
