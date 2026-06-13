import { ArrowDownLeft, ArrowUpRight, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatXAF, formatRelative } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { TransactionWithParties } from '@/types/payment'

interface TransactionCardProps {
  transaction: TransactionWithParties
  userId: string
}

const STATUS_CONFIG = {
  pending:    { icon: Clock,         color: 'text-amber-500',   label: 'Pending',    badge: 'secondary' as const },
  processing: { icon: RefreshCw,     color: 'text-blue-500',    label: 'Processing', badge: 'secondary' as const },
  completed:  { icon: CheckCircle2,  color: 'text-emerald-500', label: 'Completed',  badge: 'default' as const },
  failed:     { icon: AlertCircle,   color: 'text-destructive', label: 'Failed',     badge: 'destructive' as const },
  cancelled:  { icon: AlertCircle,   color: 'text-muted-foreground', label: 'Cancelled', badge: 'outline' as const },
  refunded:   { icon: RefreshCw,     color: 'text-purple-500',  label: 'Refunded',   badge: 'secondary' as const },
}

const TYPE_LABELS: Record<string, string> = {
  wallet_topup:     'Wallet Top-Up',
  wallet_withdrawal:'Withdrawal',
  property_sale:    'Property Sale',
  property_rent:    'Property Rent',
  product_purchase: 'Product Purchase',
  service_payment:  'Service Payment',
  escrow_deposit:   'Escrow Deposit',
  escrow_release:   'Escrow Release',
  commission:       'Commission',
  payout:           'Payout',
  refund:           'Refund',
}

const PROVIDER_LABELS: Record<string, string> = {
  mtn_momo:     'MTN MoMo',
  orange_money: 'Orange Money',
  wallet:       'Wallet',
  bank_transfer:'Bank Transfer',
}

export function TransactionCard({ transaction: t, userId }: TransactionCardProps) {
  const isCredit  = t.payee_id === userId
  const config    = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.pending
  const StatusIcon = config.icon
  const label     = TYPE_LABELS[t.type] ?? t.type

  return (
    <div className="flex items-center gap-4 py-3 border-b last:border-0">
      {/* Direction icon */}
      <div className={cn(
        'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
        isCredit ? 'bg-emerald-100' : 'bg-red-100'
      )}>
        {isCredit
          ? <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
          : <ArrowUpRight className="h-5 w-5 text-red-600" />
        }
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{t.description ?? label}</p>
          <Badge variant={config.badge} className="text-xs shrink-0">{config.label}</Badge>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          {t.provider && <span>{PROVIDER_LABELS[t.provider] ?? t.provider}</span>}
          <span>·</span>
          <span>{formatRelative(t.created_at)}</span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className={cn('font-semibold text-sm', isCredit ? 'text-emerald-600' : 'text-foreground')}>
          {isCredit ? '+' : '-'}{formatXAF(t.amount)}
        </p>
        {t.fee > 0 && (
          <p className="text-xs text-muted-foreground">Fee: {formatXAF(t.fee)}</p>
        )}
      </div>
    </div>
  )
}
