import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, ChevronLeft, CheckCircle2, XCircle } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { payCommission, cancelCommission } from '@/lib/actions/commissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatRelative } from '@/lib/utils/format'
import { canAccessAdmin } from '@/lib/roles'

export const metadata: Metadata = { title: 'Commissions — Admin' }

const STATUS_TABS = ['pending', 'paid', 'cancelled'] as const
type CommissionStatus = (typeof STATUS_TABS)[number]

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  paid:      'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

type EarnerProfile = { full_name: string | null; email: string; role: string }

type CommissionRow = {
  id:              string
  commission_type: string
  reference_type:  string
  amount:          number
  rate_pct:        number
  currency:        string
  status:          string
  paid_at:         string | null
  created_at:      string
  earner:          EarnerProfile | EarnerProfile[] | null
}

type CommissionRowNormalized = Omit<CommissionRow, 'earner'> & {
  earner: EarnerProfile | null
}

interface SearchParams { tab?: string }

export default async function AdminCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile || !canAccessAdmin(profile.role)) redirect('/login')

  const params = await searchParams
  const tab: CommissionStatus =
    STATUS_TABS.includes(params.tab as CommissionStatus)
      ? (params.tab as CommissionStatus)
      : 'pending'

  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (adminClient as any)
    .from('commission_records')
    .select(`
      id, commission_type, reference_type, amount, rate_pct, currency, status, paid_at, created_at,
      earner:profiles!earner_id ( full_name, email, role )
    `)
    .eq('status', tab)
    .order('created_at', { ascending: false })
    .limit(100) as { data: CommissionRow[] | null }

  const commissions: CommissionRowNormalized[] = (raw ?? []).map((c) => ({
    ...c,
    earner: Array.isArray(c.earner) ? (c.earner[0] ?? null) : c.earner,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: pendingCount } = await (adminClient as any)
    .from('commission_records')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const pendingTotal = tab === 'pending'
    ? commissions.reduce((s, c) => s + c.amount, 0)
    : 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/admin"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Commission Management</h1>
            <p className="text-sm text-muted-foreground">
              {commissions.length} {tab} commission{commissions.length !== 1 ? 's' : ''}
              {tab === 'pending' && pendingTotal > 0 && ` · ${pendingTotal.toLocaleString()} XAF outstanding`}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={`/admin/commissions?tab=${s}`}
            className={`relative rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors capitalize ${
              tab === s ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
            }`}
          >
            {s}
            {s === 'pending' && (pendingCount ?? 0) > 0 && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {(pendingCount as number) > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* List */}
      {commissions.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-60" />
          <p className="text-sm font-medium text-muted-foreground capitalize">No {tab} commissions</p>
        </div>
      ) : (
        <div className="space-y-2">
          {commissions.map((c) => {
            const commissionId = c.id

            return (
              <div key={c.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[c.status] ?? 'bg-gray-100'}`}>
                        {c.status}
                      </span>
                      <span className="text-sm font-semibold">
                        {c.amount.toLocaleString()} {c.currency}
                      </span>
                      <span className="text-xs text-muted-foreground">@ {c.rate_pct}%</span>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {c.commission_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Earner: {c.earner?.full_name ?? c.earner?.email ?? 'Unknown'}
                      {c.earner?.role && ` (${c.earner.role})`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.reference_type.replace(/_/g, ' ')} · {formatRelative(c.created_at)}
                      {c.paid_at && ` · Paid ${formatRelative(c.paid_at)}`}
                    </p>
                  </div>

                  {tab === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <form action={async () => {
                        'use server'
                        await payCommission(commissionId)
                      }}>
                        <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                          Pay
                        </Button>
                      </form>
                      <form action={async () => {
                        'use server'
                        await cancelCommission(commissionId)
                      }}>
                        <Button type="submit" variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                          Cancel
                        </Button>
                      </form>
                    </div>
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
