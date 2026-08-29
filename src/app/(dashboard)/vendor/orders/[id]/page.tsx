import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { updateOrderStatus } from '@/lib/actions/vendor'
import { revalidatePath } from 'next/cache'
import type { OrderStatus } from '@/components/payments/OrderCard'

export const metadata: Metadata = { title: 'Order Detail — Vendor' }

const STATUS_LABELS: Record<string, string> = {
  pending:    'Pending',
  confirmed:  'Confirmed',
  processing: 'Processing',
  shipped:    'Shipped',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
  returned:   'Returned',
  refunded:   'Refunded',
}

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  shipped:    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  delivered:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  returned:   'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  refunded:   'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

const NEXT_STATUS: Record<string, OrderStatus | null> = {
  pending:    'confirmed',
  confirmed:  'processing',
  processing: 'shipped',
  shipped:    'delivered',
  delivered:  null,
  cancelled:  null,
  returned:   null,
  refunded:   null,
}

const NEXT_STATUS_LABEL: Record<string, string> = {
  pending:    'Confirm Order',
  confirmed:  'Mark as Processing',
  processing: 'Mark as Shipped',
  shipped:    'Mark as Delivered',
}

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

type OrderRow = {
  id:               string
  created_at:       string
  status:           string
  total:            number
  notes:            string | null
  shipping_name:    string | null
  shipping_phone:   string | null
  shipping_address: string | null
  shipping_city:    string | null
  confirmed_at:     string | null
  shipped_at:       string | null
  delivered_at:     string | null
  cancelled_at:     string | null
  profiles: { full_name: string | null; email: string | null } | null
  order_items: {
    id:           string
    product_name: string
    quantity:     number
    unit_price:   number
    total_price:  number
  }[]
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-CM', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatXAF(amount: number) {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount)
}

export default async function VendorOrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params

  const profile = await getServerProfile()
  if (!profile || profile.role !== 'vendor') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (supabase as any)
    .from('orders')
    .select(`
      id, created_at, status, total, notes,
      shipping_name, shipping_phone, shipping_address, shipping_city,
      confirmed_at, shipped_at, delivered_at, cancelled_at,
      profiles:buyer_id(full_name, email),
      order_items(id, product_name, quantity, unit_price, total_price)
    `)
    .eq('id', id)
    .eq('vendor_id', profile.id)
    .single() as { data: OrderRow | null }

  if (!order) notFound()

  const nextStatus = NEXT_STATUS[order.status] ?? null
  const nextLabel  = nextStatus ? (NEXT_STATUS_LABEL[order.status] ?? 'Advance') : null
  const statusColor = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending

  async function advanceStatus() {
    'use server'
    if (!nextStatus) return
    await updateOrderStatus(id, nextStatus)
    revalidatePath(`/vendor/orders/${id}`)
  }

  const timestamps = [
    { label: 'Placed',    value: formatDate(order.created_at) },
    { label: 'Confirmed', value: formatDate(order.confirmed_at) },
    { label: 'Shipped',   value: formatDate(order.shipped_at) },
    { label: 'Delivered', value: formatDate(order.delivered_at) },
    { label: 'Cancelled', value: formatDate(order.cancelled_at) },
  ].filter((t) => t.value !== null)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/vendor/orders"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Orders
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Placed {formatDate(order.created_at)}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusColor}`}>
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="grid gap-6">
        {/* Status action */}
        {nextStatus && nextLabel && (
          <div className="rounded-lg border bg-card p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Ready to advance this order?
            </p>
            <form action={advanceStatus}>
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {nextLabel}
              </button>
            </form>
          </div>
        )}

        {/* Order items */}
        <section className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold">Items</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium text-right">Qty</th>
                <th className="px-4 py-2 font-medium text-right">Unit Price</th>
                <th className="px-4 py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(order.order_items ?? []).map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{item.product_name}</td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">{formatXAF(item.unit_price)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatXAF(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50">
                <td colSpan={3} className="px-4 py-3 font-semibold text-right">Order Total</td>
                <td className="px-4 py-3 font-bold text-right">{formatXAF(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Buyer info */}
          <section className="rounded-lg border bg-card p-4">
            <h2 className="font-semibold mb-3">Buyer</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-16 shrink-0">Name</dt>
                <dd>{order.profiles?.full_name ?? '—'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-16 shrink-0">Email</dt>
                <dd className="truncate">{order.profiles?.email ?? '—'}</dd>
              </div>
            </dl>
          </section>

          {/* Shipping info */}
          <section className="rounded-lg border bg-card p-4">
            <h2 className="font-semibold mb-3">Shipping</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-16 shrink-0">Name</dt>
                <dd>{order.shipping_name ?? '—'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-16 shrink-0">Phone</dt>
                <dd>{order.shipping_phone ?? '—'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-16 shrink-0">City</dt>
                <dd>{order.shipping_city ?? '—'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-16 shrink-0">Address</dt>
                <dd className="whitespace-pre-line">{order.shipping_address ?? '—'}</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Notes */}
        {order.notes && (
          <section className="rounded-lg border bg-card p-4">
            <h2 className="font-semibold mb-2">Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{order.notes}</p>
          </section>
        )}

        {/* Timeline */}
        <section className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold mb-3">Timeline</h2>
          <ol className="space-y-2">
            {timestamps.map(({ label, value }) => (
              <li key={label} className="flex gap-3 text-sm">
                <span className="text-muted-foreground w-20 shrink-0">{label}</span>
                <span>{value}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
