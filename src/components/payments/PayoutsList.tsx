'use client'

import { Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatXAF, formatRelative } from '@/lib/utils/format'
import { usePayouts } from '@/hooks/payments/usePayouts'
import { cn } from '@/lib/utils/cn'

const PROVIDER_LABELS: Record<string, string> = {
  mtn_momo:    'MTN MoMo',
  orange_money:'Orange Money',
}

const STATUS_CONFIG = {
  pending:    { icon: Clock,         color: 'text-amber-500',   label: 'Pending' },
  processing: { icon: RefreshCw,     color: 'text-blue-500',    label: 'Processing' },
  completed:  { icon: CheckCircle2,  color: 'text-emerald-500', label: 'Completed' },
  failed:     { icon: AlertCircle,   color: 'text-destructive', label: 'Failed' },
  cancelled:  { icon: AlertCircle,   color: 'text-muted-foreground', label: 'Cancelled' },
}

export function PayoutsList() {
  const { data: payouts, isLoading } = usePayouts()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    )
  }

  if (!payouts || payouts.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground border rounded-xl">
        No payout requests yet
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/50">
        <h3 className="text-sm font-medium">Payout History</h3>
      </div>
      <div className="divide-y">
        {payouts.map(p => {
          const config = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
          const Icon   = config.icon

          return (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Icon className={cn('h-4 w-4', config.color)} />
                  {PROVIDER_LABELS[p.provider] ?? p.provider}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.account_details?.phone} · {formatRelative(p.created_at)}
                </p>
                {p.failure_reason && (
                  <p className="text-xs text-destructive mt-0.5">{p.failure_reason}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatXAF(p.net_amount)}</p>
                <p className="text-xs text-muted-foreground">
                  -{formatXAF(p.fee)} fee
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
