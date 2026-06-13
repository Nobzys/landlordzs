'use client'

import Link from 'next/link'
import { Shield, Clock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatXAF, formatDate, formatRelative } from '@/lib/utils/format'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils/cn'
import type { EscrowAccountRow } from '@/types/payment'

interface EscrowCardProps {
  escrow: EscrowAccountRow
}

const STATUS_CONFIG = {
  pending:   { icon: Clock,         color: 'text-amber-500',   bg: 'bg-amber-50',   label: 'Awaiting payment' },
  funded:    { icon: Shield,        color: 'text-blue-600',    bg: 'bg-blue-50',    label: 'Funds secured' },
  released:  { icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Completed' },
  disputed:  { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-red-50',     label: 'Disputed' },
  refunded:  { icon: CheckCircle2,  color: 'text-purple-600',  bg: 'bg-purple-50',  label: 'Refunded' },
  cancelled: { icon: Clock,         color: 'text-muted-foreground', bg: 'bg-muted', label: 'Cancelled' },
}

export function EscrowCard({ escrow }: EscrowCardProps) {
  const user   = useAuthStore(s => s.user)
  const config = STATUS_CONFIG[escrow.status] ?? STATUS_CONFIG.pending
  const Icon   = config.icon
  const isPayer = user?.id === escrow.payer_id
  const role    = isPayer ? 'Payer' : 'Payee'

  return (
    <Link href={`/account/escrow/${escrow.id}`}>
      <div className="rounded-xl border p-4 hover:shadow-sm transition-shadow cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn('rounded-full p-2', config.bg)}>
              <Icon className={cn('h-5 w-5', config.color)} />
            </div>
            <div>
              <p className="text-sm font-medium capitalize">
                {escrow.reference_type.replace('_', ' ')} Escrow
              </p>
              <p className="text-xs text-muted-foreground">
                {role} · {formatRelative(escrow.created_at)}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="font-semibold">{formatXAF(escrow.amount)}</p>
            <Badge
              variant={escrow.status === 'funded' ? 'default' : 'secondary'}
              className="text-xs mt-0.5"
            >
              {config.label}
            </Badge>
          </div>
        </div>

        {escrow.status === 'funded' && escrow.release_date && (
          <p className="text-xs text-muted-foreground mt-3">
            Auto-releases {formatDate(escrow.release_date)} unless approved earlier
          </p>
        )}
      </div>
    </Link>
  )
}
