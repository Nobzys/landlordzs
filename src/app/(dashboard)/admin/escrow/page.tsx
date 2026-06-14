import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Scale, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveDisputeAdmin } from '@/lib/actions/escrow'
import { Button } from '@/components/ui/button'
import { formatRelative } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Escrow Management — Admin' }

const STATUS_TABS = ['disputed', 'active', 'completed'] as const
type EscrowTab = (typeof STATUS_TABS)[number]

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-gray-100 text-gray-700',
  funded:    'bg-blue-100 text-blue-700',
  released:  'bg-emerald-100 text-emerald-700',
  disputed:  'bg-red-100 text-red-700',
  refunded:  'bg-amber-100 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

type PartyProfile = { full_name: string | null; email: string }

type EscrowRow = {
  id:               string
  amount:           number
  platform_fee:     number
  currency:         string
  status:           string
  description:      string | null
  dispute_reason:   string | null
  resolution_notes: string | null
  created_at:       string
  funded_at:        string | null
  disputed_at:      string | null
  payer:            PartyProfile | PartyProfile[] | null
  payee:            PartyProfile | PartyProfile[] | null
}

type EscrowRowNormalized = Omit<EscrowRow, 'payer' | 'payee'> & {
  payer: PartyProfile | null
  payee: PartyProfile | null
}

interface SearchParams { tab?: string }

export default async function AdminEscrowPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const params = await searchParams
  const tab: EscrowTab =
    STATUS_TABS.includes(params.tab as EscrowTab) ? (params.tab as EscrowTab) : 'disputed'

  const adminClient = createAdminClient()

  const statusIn =
    tab === 'disputed'  ? ['disputed'] :
    tab === 'active'    ? ['pending', 'funded'] :
    ['released', 'refunded', 'cancelled']

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (adminClient as any)
    .from('escrow_accounts')
    .select(`
      id, amount, platform_fee, currency, status, description,
      dispute_reason, resolution_notes,
      created_at, funded_at, disputed_at,
      payer:profiles!payer_id ( full_name, email ),
      payee:profiles!payee_id ( full_name, email )
    `)
    .in('status', statusIn)
    .order('created_at', { ascending: false })
    .limit(100) as { data: EscrowRow[] | null }

  const escrows: EscrowRowNormalized[] = (raw ?? []).map((e) => ({
    ...e,
    payer: Array.isArray(e.payer) ? (e.payer[0] ?? null) : e.payer,
    payee: Array.isArray(e.payee) ? (e.payee[0] ?? null) : e.payee,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: disputedCount } = await (adminClient as any)
    .from('escrow_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'disputed')

  const fmtAmt = (n: number, currency: string) => `${n.toLocaleString()} ${currency}`

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/admin"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Escrow Management</h1>
            <p className="text-sm text-muted-foreground">
              {escrows.length} {tab} escrow{escrows.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={`/admin/escrow?tab=${s}`}
            className={`relative rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors capitalize ${
              tab === s ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
            }`}
          >
            {s === 'disputed' ? 'Disputed' : s === 'active' ? 'Active' : 'Completed'}
            {s === 'disputed' && (disputedCount ?? 0) > 0 && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {(disputedCount as number) > 9 ? '9+' : disputedCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* List */}
      {escrows.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-60" />
          <p className="text-sm font-medium text-muted-foreground capitalize">No {tab} escrows</p>
        </div>
      ) : (
        <div className="space-y-3">
          {escrows.map((e) => {
            const escrowId   = e.id
            const netRelease = e.amount - e.platform_fee

            return (
              <div key={e.id} className="rounded-xl border bg-card p-4 space-y-3">
                {/* Info row */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[e.status] ?? 'bg-gray-100'}`}>
                        {e.status}
                      </span>
                      <span className="text-sm font-semibold">{fmtAmt(e.amount, e.currency)}</span>
                      {e.platform_fee > 0 && (
                        <span className="text-xs text-muted-foreground">
                          (platform fee: {fmtAmt(e.platform_fee, e.currency)})
                        </span>
                      )}
                    </div>
                    {e.description && (
                      <p className="text-sm">{e.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                      <p>Payer: {e.payer?.full_name ?? e.payer?.email ?? 'Unknown'}</p>
                      <p>Payee: {e.payee?.full_name ?? e.payee?.email ?? 'Unknown'}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {formatRelative(e.created_at)}
                      {e.disputed_at && ` · Disputed ${formatRelative(e.disputed_at)}`}
                    </p>
                  </div>
                </div>

                {/* Dispute reason */}
                {e.dispute_reason && (
                  <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                    <p className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Dispute reason
                    </p>
                    <p className="text-xs text-red-600">{e.dispute_reason}</p>
                  </div>
                )}

                {/* Resolution notes */}
                {e.resolution_notes && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs font-medium mb-1">Resolution notes</p>
                    <p className="text-xs text-muted-foreground">{e.resolution_notes}</p>
                  </div>
                )}

                {/* Dispute resolution actions */}
                {tab === 'disputed' && (
                  <div className="pt-2 border-t space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Release to payee: <strong>{fmtAmt(netRelease, e.currency)}</strong>
                      {' '}·{' '}
                      Refund to payer: <strong>{fmtAmt(e.amount, e.currency)}</strong>
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <form
                        action={async (fd: FormData) => {
                          'use server'
                          const notes = (fd.get('notes') as string | null)?.trim()
                            || 'Admin resolved: funds released to payee'
                          await resolveDisputeAdmin(escrowId, 'release_to_payee', notes)
                        }}
                        className="flex flex-1 gap-2"
                      >
                        <input
                          name="notes"
                          placeholder="Resolution notes (release)"
                          className="flex-1 min-w-0 rounded-md border px-3 py-1.5 text-xs bg-background
                            placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                          Release to Payee
                        </Button>
                      </form>

                      <form
                        action={async (fd: FormData) => {
                          'use server'
                          const notes = (fd.get('refund_notes') as string | null)?.trim()
                            || 'Admin resolved: funds refunded to payer'
                          await resolveDisputeAdmin(escrowId, 'refund_to_payer', notes)
                        }}
                        className="flex gap-2"
                      >
                        <input
                          name="refund_notes"
                          placeholder="Refund notes"
                          className="w-36 rounded-md border px-3 py-1.5 text-xs bg-background
                            placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className="text-amber-600 border-amber-200 hover:bg-amber-50 shrink-0"
                        >
                          Refund to Payer
                        </Button>
                      </form>
                    </div>
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
