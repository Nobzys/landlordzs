import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Eye, ShoppingCart, BarChart3, TrendingUp } from 'lucide-react'
import { MetricsGrid } from '@/components/dashboard/MetricsGrid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { formatXAF } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Analytics — Vendor' }

export default async function VendorAnalyticsPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'vendor') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)

  const [
    { data: vendor },
    { data: products },
    { data: orders },
  ] = await Promise.all([
    sb.from('vendor_profiles').select('store_view_count').eq('id', profile.id).single(),
    sb.from('products').select('id, name, view_count, order_count').eq('vendor_id', profile.id),
    sb.from('orders')
      .select('total, status, payment_status, created_at')
      .eq('vendor_id', profile.id)
      .gte('created_at', sixMonthsAgo.toISOString()),
  ])

  const productList = (products ?? []) as { id: string; name: string; view_count: number; order_count: number }[]
  const orderList = (orders ?? []) as { total: number; status: string; payment_status: string; created_at: string }[]

  const totalProductViews = productList.reduce((sum, p) => sum + p.view_count, 0)
  const totalOrders = orderList.length
  const totalRevenue = orderList.filter((o) => o.payment_status === 'completed').reduce((sum, o) => sum + o.total, 0)
  const conversionRate = totalProductViews > 0 ? ((totalOrders / totalProductViews) * 100).toFixed(1) : '0.0'

  const topProducts = [...productList].sort((a, b) => b.view_count - a.view_count).slice(0, 5)

  const monthlyRevenue: { label: string; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    const total = orderList
      .filter((o) => {
        const od = new Date(o.created_at)
        return o.payment_status === 'completed' && od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear()
      })
      .reduce((sum, o) => sum + o.total, 0)
    monthlyRevenue.push({ label, total })
  }
  const maxMonthly = Math.max(1, ...monthlyRevenue.map((m) => m.total))

  const statusCounts = orderList.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Last 6 months</p>
      </div>

      <MetricsGrid
        metrics={[
          { icon: Eye, label: 'Store Views', value: vendor?.store_view_count ?? 0 },
          { icon: Eye, label: 'Product Views', value: totalProductViews },
          { icon: ShoppingCart, label: 'Orders (6mo)', value: totalOrders },
          { icon: TrendingUp, label: 'Conversion Rate', value: `${conversionRate}%` },
        ]}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Monthly Revenue</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-40">
            {monthlyRevenue.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end h-32">
                  <div
                    className="w-full rounded-t bg-primary/80"
                    style={{ height: `${Math.max(4, (m.total / maxMonthly) * 100)}%` }}
                    title={formatXAF(m.total)}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-3">Total: {formatXAF(totalRevenue)}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Top Products by Views</CardTitle></CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products yet.</p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="text-muted-foreground shrink-0">{p.view_count} views · {p.order_count} orders</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Orders by Status</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(statusCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between text-sm capitalize">
                    <span>{status}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <BarChart3 className="h-3.5 w-3.5" />
        Store and product views populate once buyers browse your public storefront.
      </p>
    </div>
  )
}
