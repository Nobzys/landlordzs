import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { MetricsGrid } from '@/components/dashboard/MetricsGrid'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { formatXAF, formatDate } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Customers — Vendor' }

export default async function VendorCustomersPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'vendor') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: orders } = await sb
    .from('orders')
    .select('buyer_id, total, payment_status, created_at')
    .eq('vendor_id', profile.id) as {
      data: { buyer_id: string; total: number; payment_status: string; created_at: string }[] | null
    }

  const rows = orders ?? []
  const byBuyer = new Map<string, { orders: number; spent: number; lastOrder: string }>()
  for (const o of rows) {
    const entry = byBuyer.get(o.buyer_id) ?? { orders: 0, spent: 0, lastOrder: o.created_at }
    entry.orders += 1
    if (o.payment_status === 'completed') entry.spent += o.total
    if (o.created_at > entry.lastOrder) entry.lastOrder = o.created_at
    byBuyer.set(o.buyer_id, entry)
  }

  const buyerIds = [...byBuyer.keys()]
  const { data: buyers } = buyerIds.length > 0
    ? await sb.from('profiles').select('id, full_name, display_name, phone').in('id', buyerIds)
    : { data: [] as { id: string; full_name: string | null; display_name: string | null; phone: string | null }[] }

  const customers = (buyers ?? [])
    .map((b: { id: string; full_name: string | null; display_name: string | null; phone: string | null }) => ({
      ...b,
      ...byBuyer.get(b.id)!,
    }))
    .sort((a, b) => b.spent - a.spent)

  const totalSpent = customers.reduce((sum, c) => sum + c.spent, 0)
  const repeatCustomers = customers.filter((c) => c.orders > 1).length

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-sm text-muted-foreground">{customers.length} total</p>
      </div>

      <MetricsGrid
        metrics={[
          { icon: Users, label: 'Total Customers', value: customers.length },
          { icon: Users, label: 'Repeat Customers', value: repeatCustomers },
          { icon: Users, label: 'Lifetime Revenue', value: formatXAF(totalSpent) },
        ]}
      />

      {customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet." description="Buyers who order from your store will appear here." />
      ) : (
        <div className="space-y-3">
          {customers.map((c) => (
            <div key={c.id} className="flex items-center gap-4 rounded-xl border p-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{c.display_name ?? c.full_name ?? 'Buyer'}</p>
                <p className="text-sm text-muted-foreground">
                  {c.phone ?? 'No phone on file'} · {c.orders} order{c.orders === 1 ? '' : 's'} · Last order {formatDate(c.lastOrder)}
                </p>
              </div>
              <p className="font-semibold shrink-0">{formatXAF(c.spent)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
