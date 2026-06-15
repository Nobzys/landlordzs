'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Clock, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatXAF, formatDate, formatRelative } from '@/lib/utils/format'
import { useCommissions, useCommissionSummary } from '@/hooks/payments/useCommissions'

export function CommissionSummary() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const { data: summary, isLoading: summaryLoading } = useCommissionSummary()
  const { data: records, isLoading: recordsLoading } = useCommissions()

  if (summaryLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          label="Total Earned"
          value={formatXAF(summary?.total_earned ?? 0)}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          label="Pending"
          value={formatXAF(summary?.pending_amount ?? 0)}
          sub={`${summary?.pending_count ?? 0} commission${summary?.pending_count !== 1 ? 's' : ''}`}
          bg="bg-amber-50"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          label="Paid Out"
          value={formatXAF(summary?.paid_amount ?? 0)}
          sub={`${summary?.paid_count ?? 0} commission${summary?.paid_count !== 1 ? 's' : ''}`}
          bg="bg-emerald-50"
        />
      </div>

      {/* Recent commissions */}
      <div className="rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/50">
          <h3 className="text-sm font-medium">Commission History</h3>
        </div>
        {recordsLoading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : !records || records.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No commissions yet
          </div>
        ) : (
          <div className="divide-y">
            {records.map(r => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium capitalize">
                    {r.commission_type} commission
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.rate_pct}% · {mounted ? formatRelative(r.created_at) : formatDate(r.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatXAF(r.amount)}</p>
                  <Badge
                    variant={r.status === 'paid' ? 'default' : r.status === 'cancelled' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {r.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, bg }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; bg: string
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className={`inline-flex rounded-full p-2 ${bg} mb-3`}>{icon}</div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}
