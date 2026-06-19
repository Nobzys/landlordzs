import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ClipboardList, Clock, CheckCircle2, Truck, PackageCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { MetricsGrid } from '@/components/dashboard/MetricsGrid'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { updateOrderStatus } from '@/lib/actions/marketplace'
import { formatXAF, formatDate } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Orders — Vendor' }

type OrderRow = {
  id: string
  buyer_id: string
  status: string
  total: number
  payment_status: string
  shipping_name: string | null
  created_at: string
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:    { label: 'Pending',    variant: 'outline' },
  confirmed:  { label: 'Confirmed',  variant: 'secondary' },
  processing: { label: 'Processing', variant: 'secondary' },
  shipped:    { label: 'Shipped',    variant: 'default' },
  delivered:  { label: 'Delivered',  variant: 'default' },
  cancelled:  { label: 'Cancelled',  variant: 'destructive' },
  returned:   { label: 'Returned',   variant: 'destructive' },
  refunded:   { label: 'Refunded',   variant: 'destructive' },
}

const NEXT_STATUS: Record<string, { next: string; label: string; icon: typeof CheckCircle2 }> = {
  pending:    { next: 'confirmed',  label: 'Confirm',      icon: CheckCircle2 },
  confirmed:  { next: 'processing', label: 'Start Processing', icon: PackageCheck },
  processing: { next: 'shipped',    label: 'Mark Shipped', icon: Truck },
  shipped:    { next: 'delivered',  label: 'Mark Delivered', icon: PackageCheck },
}

export default async function VendorOrdersPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'vendor') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: orders } = await sb
    .from('orders')
    .select('id, buyer_id, status, total, payment_status, shipping_name, created_at')
    .eq('vendor_id', profile.id)
    .order('created_at', { ascending: false }) as { data: OrderRow[] | null }

  const list = orders ?? []
  const buyerIds = [...new Set(list.map((o) => o.buyer_id))]
  const { data: buyers } = buyerIds.length > 0
    ? await sb.from('profiles').select('id, full_name, display_name').in('id', buyerIds)
    : { data: [] as { id: string; full_name: string | null; display_name: string | null }[] }

  const buyerName = new Map<string, string>(
    (buyers ?? []).map((b: { id: string; full_name: string | null; display_name: string | null }) =>
      [b.id, b.display_name ?? b.full_name ?? 'Buyer'] as [string, string])
  )

  const pendingCount = list.filter((o) => o.status === 'pending').length
  const processingCount = list.filter((o) => o.status === 'processing' || o.status === 'confirmed').length
  const deliveredCount = list.filter((o) => o.status === 'delivered').length
  const totalRevenue = list.filter((o) => o.payment_status === 'completed').reduce((sum, o) => sum + o.total, 0)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">{list.length} total</p>
      </div>

      <MetricsGrid
        metrics={[
          { icon: Clock, label: 'Pending', value: pendingCount },
          { icon: PackageCheck, label: 'In Progress', value: processingCount },
          { icon: Truck, label: 'Delivered', value: deliveredCount },
          { icon: ClipboardList, label: 'Revenue Collected', value: formatXAF(totalRevenue) },
        ]}
      />

      {list.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No orders yet." description="Orders placed by buyers will appear here." />
      ) : (
        <div className="space-y-3">
          {list.map((o) => {
            const badge = STATUS_BADGE[o.status] ?? { label: o.status, variant: 'secondary' as const }
            const action = NEXT_STATUS[o.status]
            return (
              <div key={o.id} className="flex items-center gap-4 rounded-xl border p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{o.shipping_name ?? buyerName.get(o.buyer_id) ?? 'Buyer'}</p>
                    <Badge variant={badge.variant} className="shrink-0 text-xs">{badge.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatXAF(o.total)} · {formatDate(o.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {action && (
                    <form action={async () => {
                      'use server'
                      await updateOrderStatus(o.id, action.next)
                    }}>
                      <Button variant="outline" size="sm" type="submit" className="gap-1.5">
                        <action.icon className="h-3.5 w-3.5" />
                        {action.label}
                      </Button>
                    </form>
                  )}
                  {(o.status === 'pending' || o.status === 'confirmed' || o.status === 'processing') && (
                    <form action={async () => {
                      'use server'
                      await updateOrderStatus(o.id, 'cancelled')
                    }}>
                      <Button variant="ghost" size="sm" type="submit" className="text-destructive hover:text-destructive">
                        Cancel
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
