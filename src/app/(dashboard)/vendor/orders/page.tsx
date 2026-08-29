import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { OrderCard, type OrderSummary, type OrderStatus } from '@/components/payments/OrderCard'

export const metadata: Metadata = { title: 'Orders — Vendor' }

const PAGE_SIZE = 15

const ALL_STATUSES: OrderStatus[] = [
  'pending', 'confirmed', 'processing', 'shipped', 'delivered',
  'cancelled', 'returned', 'refunded',
]

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:    'Pending',
  confirmed:  'Confirmed',
  processing: 'Processing',
  shipped:    'Shipped',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
  returned:   'Returned',
  refunded:   'Refunded',
}

interface VendorOrdersPageProps {
  searchParams: Promise<{ page?: string; status?: string }>
}

type OrderRow = {
  id:           string
  created_at:   string
  status:       string
  total:        number
  shipping_city: string | null
  profiles:     { full_name: string | null } | null
  order_items:  { id: string }[]
}

export default async function VendorOrdersPage({ searchParams }: VendorOrdersPageProps) {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'vendor') redirect('/login')
  requireActiveProfile(profile)

  const { page: pageParam, status: statusParam } = await searchParams
  const page         = Math.max(1, parseInt(pageParam ?? '1', 10))
  const statusFilter = ALL_STATUSES.includes(statusParam as OrderStatus) ? (statusParam as OrderStatus) : null
  const offset       = (page - 1) * PAGE_SIZE

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('orders')
    .select(`
      id, created_at, status, total, shipping_city,
      profiles:buyer_id(full_name),
      order_items(id)
    `, { count: 'exact' })
    .eq('vendor_id', profile.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data: rows, count } = await query as {
    data: OrderRow[] | null
    count: number | null
  }

  const orders: OrderSummary[] = (rows ?? []).map((row) => ({
    id:            row.id,
    created_at:    row.created_at,
    status:        row.status as OrderStatus,
    total_amount:  row.total,
    item_count:    row.order_items?.length ?? 0,
    buyer_name:    row.profiles?.full_name ?? null,
    shipping_city: row.shipping_city,
  }))

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  function pageHref(p: number, s?: string) {
    const params = new URLSearchParams()
    if (p > 1) params.set('page', String(p))
    if (s) params.set('status', s)
    const qs = params.toString()
    return `/vendor/orders${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {count ?? 0} order{(count ?? 0) !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        <Link
          href={pageHref(1)}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            !statusFilter
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          All
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={pageHref(1, s)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {/* Order list */}
      {orders.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="font-semibold text-lg mb-1">No orders yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {statusFilter
              ? `No orders with status "${STATUS_LABELS[statusFilter]}" at this time.`
              : 'Orders placed by buyers for your products will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(page - 1, statusFilter ?? undefined)}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref(page + 1, statusFilter ?? undefined)}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
