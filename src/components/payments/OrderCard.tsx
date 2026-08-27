import Link from 'next/link'

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded'

export interface OrderSummary {
  id: string
  created_at: string
  status: OrderStatus
  total_amount: number
  item_count: number
  buyer_name: string | null
  shipping_city: string | null
}

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

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  shipped:    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  delivered:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  returned:   'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  refunded:   'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CM', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatXAF(amount: number) {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount)
}

interface OrderCardProps {
  order: OrderSummary
}

export function OrderCard({ order }: OrderCardProps) {
  const statusLabel = STATUS_LABELS[order.status] ?? order.status
  const statusColor = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending

  return (
    <Link
      href={`/vendor/orders/${order.id}`}
      className="block rounded-lg border bg-card hover:bg-accent/50 transition-colors p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDate(order.created_at)}
          </p>
        </div>

        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {order.buyer_name ?? 'Customer'}
          {order.shipping_city ? ` · ${order.shipping_city}` : ''}
        </span>
        <span className="font-medium text-foreground">
          {formatXAF(order.total_amount)}
        </span>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {order.item_count} {order.item_count === 1 ? 'item' : 'items'}
      </p>
    </Link>
  )
}
