import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Wallet, ChevronLeft, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processPayoutAdmin, retryPayoutAdmin } from '@/lib/actions/payments'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { formatXAF, formatRelative } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Payout Management — Admin' }

const STATUS_TABS = ['pending', 'processing', 'completed', 'failed'] as const
type PayoutStatus = (typeof STATUS_TABS)[number]

const STATUS_COLOR: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed:  'bg-emerald-100 text-emerald-700',
  failed:     'bg-red-100 text-red-700',
}

const PROVIDER_LABEL: Record<string, string> = {
  mtn_momo:     'MTN MoMo',
  orange_money: 'Orange Money',
  bank_transfer: 'Bank Transfer',
}

type PayoutRow = {
  id: string
  recipient_id: string
  amount: number
  fee: number
  net_amount: number
  provider: string
  account_details: { phone?: string }
  status: string
  failure_reason: string | null
  created_at: string
  initiated_at: string | null
  completed_at: string | null
  recipient: {
    full_name: string | null
    display_name: string | null
    email: string
  } | null
}

interface SearchParams { status?: string }

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const params = await searchParams
  const statusFilter: PayoutStatus =
    STATUS_TABS.includes(params.status as PayoutStatus)
      ? (params.status as PayoutStatus)
      : 'pending'

  const supabase = await createClient()

  const { data: raw, count } = await (supabase as any)
    .from('payouts')
    .select(
      `id, recipient_id, amount, fee, net_amount, provider, account_details,
       status, failure_reason, created_at, initiated_at, completed_at,
       recipient:profiles!payouts_recipient_id_fkey ( full_name, display_name, email )`,
      { count: 'exact' }
    )
    .eq('status', statusFilter)
    .order('created_at', { ascending: statusFilter === 'pending' })
    .limit(50)

  const payouts: PayoutRow[] = raw ?? []

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LinkButton href="/admin" variant="ghost" size="icon" className="-ml-2">
          <ChevronLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Payout Management</h1>
            <p className="text-sm text-muted-foreground capitalize">
              {count ?? 0} {statusFilter} payout{(count ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={`/admin/payouts?status=${s}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors capitalize ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {/* List */}
      {payouts.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-60" />
          <p className="text-sm font-medium text-muted-foreground capitalize">
            No {statusFilter} payouts
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payouts.map((p) => {
            const recipientName =
              p.recipient?.full_name ??
              p.recipient?.display_name ??
              p.recipient?.email ??
              'Unknown'
            const recipientId = p.recipient_id
            const payoutId    = p.id
            const lockedAmt   = p.amount

            return (
              <div key={p.id} className="rounded-xl border bg-card p-4 space-y-3">
                {/* Info row */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{recipientName}</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[p.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {p.status}
                      </span>
                    </div>
                    {p.recipient?.email && (
                      <p className="text-xs text-muted-foreground">{p.recipient.email}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {PROVIDER_LABEL[p.provider] ?? p.provider}
                      {p.account_details?.phone && <> · {p.account_details.phone}</>}
                    </p>
                    {p.failure_reason && (
                      <p className="text-xs text-destructive">Reason: {p.failure_reason}</p>
                    )}
                    {p.initiated_at && (
                      <p className="text-xs text-muted-foreground">
                        Initiated {formatRelative(p.initiated_at)}
                      </p>
                    )}
                    {p.completed_at && (
                      <p className="text-xs text-muted-foreground">
                        Completed {formatRelative(p.completed_at)}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-xl font-bold">{formatXAF(p.net_amount)}</p>
                    {p.fee > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Fee: {formatXAF(p.fee)} · Gross: {formatXAF(p.amount)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{formatRelative(p.created_at)}</p>
                  </div>
                </div>

                {/* Pending actions: Process + Reject */}
                {p.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                    <form action={async () => {
                      'use server'
                      await processPayoutAdmin(payoutId)
                    }}>
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Process Payout
                      </Button>
                    </form>

                    <form
                      action={async (fd: FormData) => {
                        'use server'
                        const reason = (fd.get('reason') as string | null)?.trim() || 'Rejected by admin'
                        const adminClient = createAdminClient()
                        // Status update FIRST with CAS (.eq('status','pending')) so a concurrent
                        // processPayoutAdmin sees 'failed' and aborts — same ordering fix as cancelPayout.
                        const { data: rejected } = await (adminClient as any)
                          .from('payouts')
                          .update({
                            status:         'failed',
                            failure_reason: reason,
                            failed_at:      new Date().toISOString(),
                          })
                          .eq('id', payoutId)
                          .eq('status', 'pending')
                          .select('id')
                          .single()
                        if (rejected) {
                          await (adminClient as any).rpc('wallet_unlock', {
                            p_user_id: recipientId,
                            p_amount:  lockedAmt,
                          })
                        }
                        revalidatePath('/admin/payouts')
                      }}
                      className="flex flex-1 gap-2"
                    >
                      <input
                        name="reason"
                        placeholder="Rejection reason (optional)"
                        className="flex-1 min-w-0 rounded-md border px-3 py-1.5 text-xs bg-background
                          placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                        Reject
                      </Button>
                    </form>
                  </div>
                )}

                {/* Processing action: Mark Paid */}
                {p.status === 'processing' && (
                  <div className="pt-2 border-t">
                    <form action={async () => {
                      'use server'
                      const adminClient = createAdminClient()
                      await (adminClient as any)
                        .from('payouts')
                        .update({
                          status: 'completed',
                          completed_at: new Date().toISOString(),
                        })
                        .eq('id', payoutId)
                        .eq('status', 'processing')
                      revalidatePath('/admin/payouts')
                    }}>
                      <Button type="submit" variant="outline" size="sm">
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        Mark Paid
                      </Button>
                    </form>
                  </div>
                )}

                {/* Failed action: Retry */}
                {p.status === 'failed' && (
                  <div className="pt-2 border-t">
                    <form action={async () => {
                      'use server'
                      await retryPayoutAdmin(payoutId)
                    }}>
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        Retry Payout
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
