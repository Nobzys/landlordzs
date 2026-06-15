'use client'

import { useState, useEffect } from 'react'
import { Clock, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatXAF, formatDate, formatRelative } from '@/lib/utils/format'
import { usePayouts } from '@/hooks/payments/usePayouts'
import { cancelPayout } from '@/lib/actions/payments'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
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
  const queryClient = useQueryClient()
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  async function handleCancel(payoutId: string) {
    setCancelling(payoutId)
    try {
      await cancelPayout(payoutId)
      queryClient.invalidateQueries({ queryKey: queryKeys.payouts.list() })
    } finally {
      setCancelling(null)
    }
  }

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
            <div key={p.id} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Icon className={cn('h-4 w-4 shrink-0', config.color)} />
                  {PROVIDER_LABELS[p.provider] ?? p.provider}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.account_details?.phone} · {mounted ? formatRelative(p.created_at) : formatDate(p.created_at)}
                </p>
                {p.failure_reason && (
                  <p className="text-xs text-destructive mt-0.5">{p.failure_reason}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatXAF(p.net_amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    -{formatXAF(p.fee)} fee
                  </p>
                </div>
                {p.status === 'pending' && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={cancelling === p.id}
                    onClick={() => handleCancel(p.id)}
                    title="Cancel payout"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
