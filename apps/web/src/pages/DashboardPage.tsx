import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { api } from '@/lib/api'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TrendingUp, TrendingDown, Euro, Route, Bus } from 'lucide-react'

export function DashboardPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [summary, setSummary] = useState<any>(null)
  const [ranking, setRanking] = useState<any[]>([])
  const [kpis, setKpis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.dashboard.summary(month, year),
      api.dashboard.ranking(month, year),
      api.dashboard.kpis(
        new Date(year - 1, month - 1, 1).toISOString(),
        new Date(year, month, 0, 23, 59, 59, 999).toISOString()
      ),
    ]).then(([s, r, k]) => {
      setSummary(s)
      setRanking(r)
      setKpis(k)
    }).finally(() => setLoading(false))
  }, [month, year])

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

  return (
    <Layout>
      <div className="p-6 space-y-6" style={{ minHeight: '100vh' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#fff' }}>Tableau de bord</h1>
          <div className="flex gap-2">
            <select value={month} onChange={e => setMonth(+e.target.value)} className="border rounded px-2 py-1 text-sm">
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(+e.target.value)} className="border rounded px-2 py-1 text-sm">
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : summary && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                    <Euro className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold mt-2">{fmt(summary.revenue)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Coûts totaux</p>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold mt-2">{fmt(summary.totalCost)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Marge brute</p>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className={`text-2xl font-bold mt-2 ${summary.margin < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {fmt(summary.margin)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Km parcourus</p>
                    <Route className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold mt-2">{summary.kmTotal.toFixed(0)} km</p>
                  <p className="text-xs text-muted-foreground">{summary.tourCount} tournées</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>CA vs Coûts (12 derniers mois)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64" /> : (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={kpis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={v => v.split('-')[1] + '/' + v.split('-')[0].slice(2)} />
                  <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k€`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="revenue" name="CA" fill="#3b82f6" />
                  <Bar dataKey="cost" name="Coûts" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Least profitable tours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" />
              10 tournées les moins rentables du mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48" /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tournée</TableHead>
                    <TableHead>Chauffeur</TableHead>
                    <TableHead>CA facturé</TableHead>
                    <TableHead>Coût total</TableHead>
                    <TableHead>Marge</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.slice(-10).reverse().map((tour: any) => (
                    <TableRow key={tour.id}>
                      <TableCell>
                        <Link to={`/tours/${tour.id}`} className="text-primary hover:underline">{tour.name}</Link>
                      </TableCell>
                      <TableCell>{tour.driver?.firstName} {tour.driver?.lastName}</TableCell>
                      <TableCell>{tour.billedPrice ? fmt(tour.billedPrice) : '-'}</TableCell>
                      <TableCell>{tour.cost ? fmt(tour.cost.totalCost) : '-'}</TableCell>
                      <TableCell>
                        {tour.cost?.margin != null ? (
                          <Badge variant={tour.cost.margin < 0 ? 'destructive' : 'success'}>
                            {fmt(tour.cost.margin)}
                          </Badge>
                        ) : '-'}
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
