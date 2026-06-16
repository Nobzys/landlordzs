import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AlertTriangle, Download } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAccessAdmin } from '@/lib/roles'
import { adminGrantActivation, adminSuspendSubscription, adminRefundPayment, adminRetryPayment } from '@/lib/actions/billing'
import { Button } from '@/components/ui/button'
import { formatXAF, formatDate } from '@/lib/utils/format'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'
import {
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_COLORS,
  BILLING_TYPE_LABELS,
} from '@/types/billing'
import type { Subscription, Invoice, BillingPayment } from '@/types/billing'

export const metadata: Metadata = { title: 'Billing — Admin' }

const STATUS_OPTIONS = [
  { value: '',          label: 'All statuses' },
  { value: 'active',    label: 'Active' },
  { value: 'pending',   label: 'Pending' },
  { value: 'past_due',  label: 'Past Due' },
  { value: 'expired',   label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PROVIDER_OPTIONS = [
  { value: '',             label: 'All providers' },
  { value: 'stripe',       label: 'Stripe' },
  { value: 'paypal',       label: 'PayPal' },
  { value: 'mtn_momo',     label: 'MTN MoMo' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'mock',         label: 'Mock' },
]

const PROVIDER_LABELS: Record<string, string> = {
  stripe:       'Stripe',
  paypal:       'PayPal',
  mtn_momo:     'MTN MoMo',
  orange_money: 'Orange Money',
  mock:         'Mock',
  wallet:       'Wallet',
}

interface SearchParams { tab?: string; status?: string; provider?: string }

type SubRow = Subscription & {
  plan: { name: string; billing_type: string; amount: number } | null
  user: { id: string; full_name: string | null; display_name: string | null; email: string; role: string } | null
}

type PaymentRow = BillingPayment & {
  user: { full_name: string | null; display_name: string | null; email: string } | null
}

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile || !canAccessAdmin(profile.role)) redirect('/login')

  const { tab = 'subscriptions', status = '', provider = '' } = await searchParams
  const adminClient = createAdminClient()

  // ── Subscriptions ─────────────────────────────────────────────────────────
  let subQuery = (adminClient as any)
    .from('subscriptions')
    .select('*, plan:subscription_plans(name,billing_type,amount), user:profiles(id,full_name,display_name,email,role)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (status) subQuery = subQuery.eq('status', status)
  const { data: subs } = await subQuery as { data: SubRow[] | null }

  // ── Invoices ──────────────────────────────────────────────────────────────
  const { data: invoices } = await (adminClient as any)
    .from('invoices')
    .select('*, user:profiles(full_name,display_name,email)')
    .order('issued_at', { ascending: false })
    .limit(100) as { data: (Invoice & { user: { full_name: string | null; display_name: string | null; email: string } | null })[] | null }

  // ── Payments (with optional provider filter) ──────────────────────────────
  let pmtQuery = (adminClient as any)
    .from('payments')
    .select('*, user:profiles(full_name,display_name,email)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (provider) pmtQuery = pmtQuery.eq('provider', provider)
  const { data: payments } = await pmtQuery as { data: PaymentRow[] | null }

  // ── Failed payments ───────────────────────────────────────────────────────
  const { data: failedPayments } = await (adminClient as any)
    .from('payments')
    .select('*, user:profiles(full_name,display_name,email)')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(50) as { data: PaymentRow[] | null }

  // ── Plans ─────────────────────────────────────────────────────────────────
  const { data: plans } = await (adminClient as any)
    .from('subscription_plans')
    .select('*')
    .order('role')
    .order('amount') as { data: any[] | null }

  // ── Revenue by provider ───────────────────────────────────────────────────
  const revenueByProvider: Record<string, number> = {}
  for (const pmt of payments ?? []) {
    if (pmt.status === 'completed') {
      revenueByProvider[pmt.provider] = (revenueByProvider[pmt.provider] ?? 0) + pmt.amount
    }
  }
  const totalRevenue  = Object.values(revenueByProvider).reduce((a, b) => a + b, 0)

  const tabs = ['subscriptions', 'invoices', 'payments', 'failed', 'plans', 'revenue'] as const

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Subscriptions · Invoices · Payments · Failed Queue · Revenue
        </p>
      </div>

      {/* Tab bar */}
      <nav className="flex gap-1 border-b overflow-x-auto">
        {tabs.map(t => (
          <a
            key={t}
            href={`?tab=${t}`}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'failed' ? `Failed (${failedPayments?.length ?? 0})` : t}
          </a>
        ))}
      </nav>

      {/* ── Subscriptions ─────────────────────────────────────────────── */}
      {tab === 'subscriptions' && (
        <div className="space-y-4">
          <form method="get" className="flex gap-3 flex-wrap">
            <input type="hidden" name="tab" value="subscriptions" />
            <select name="status" defaultValue={status}
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none">
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Button type="submit" size="sm">Filter</Button>
            {status && <a href="?tab=subscriptions" className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent">Clear</a>}
          </form>

          <p className="text-sm text-muted-foreground">{subs?.length ?? 0} result{subs?.length !== 1 ? 's' : ''}</p>

          {!subs?.length ? <EmptyState message="No subscriptions found." /> : (
            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expires</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {subs.map(sub => {
                      const userName  = sub.user?.display_name ?? sub.user?.full_name ?? sub.user?.email ?? '—'
                      const roleLabel = ROLE_LABELS[sub.user?.role as UserRole] ?? sub.user?.role ?? '—'
                      return (
                        <tr key={sub.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <p className="font-medium truncate max-w-[160px]">{userName}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[160px]">{sub.user?.email}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{roleLabel}</td>
                          <td className="px-4 py-3">
                            {sub.plan ? (
                              <>
                                <p className="text-xs font-medium">{sub.plan.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatXAF(sub.plan.amount)} · {BILLING_TYPE_LABELS[sub.plan.billing_type as keyof typeof BILLING_TYPE_LABELS] ?? sub.plan.billing_type}
                                </p>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Manual grant</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${SUBSCRIPTION_STATUS_COLORS[sub.status]}`}>
                              {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {sub.expires_at ? formatDate(sub.expires_at) : 'Never'}
                          </td>
                          <td className="px-4 py-3">
                            {sub.status === 'active' && (
                              <form action={async () => {
                                'use server'
                                await adminSuspendSubscription(sub.id)
                              }}>
                                <Button type="submit" variant="outline" size="sm"
                                  className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7">
                                  Suspend
                                </Button>
                              </form>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <GrantActivationForm />
        </div>
      )}

      {/* ── Invoices ──────────────────────────────────────────────────── */}
      {tab === 'invoices' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{invoices?.length ?? 0} invoices</p>
          {!invoices?.length ? <EmptyState message="No invoices yet." /> : (
            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Issued</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paid</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-xs">{inv.user?.display_name ?? inv.user?.full_name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{inv.user?.email}</p>
                        </td>
                        <td className="px-4 py-3 font-medium">{formatXAF(inv.amount)}</td>
                        <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(inv.issued_at)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{inv.paid_at ? formatDate(inv.paid_at) : '—'}</td>
                        <td className="px-4 py-3">
                          <a href={`/api/invoice/${inv.id}?print=1`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <Download className="h-3 w-3" /> PDF
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Payments ──────────────────────────────────────────────────── */}
      {tab === 'payments' && (
        <div className="space-y-4">
          <form method="get" className="flex gap-3 flex-wrap">
            <input type="hidden" name="tab" value="payments" />
            <select name="provider" defaultValue={provider}
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none">
              {PROVIDER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Button type="submit" size="sm">Filter</Button>
            {provider && <a href="?tab=payments" className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent">Clear</a>}
          </form>

          <p className="text-sm text-muted-foreground">{payments?.length ?? 0} payments</p>
          {!payments?.length ? <EmptyState message="No payments yet." /> : (
            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Provider</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reference</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payments.map((pmt: PaymentRow) => (
                      <tr key={pmt.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-xs">{pmt.user?.display_name ?? pmt.user?.full_name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{pmt.user?.email}</p>
                        </td>
                        <td className="px-4 py-3 font-medium">{formatXAF(pmt.amount)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{PROVIDER_LABELS[pmt.provider] ?? pmt.provider}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs truncate max-w-[100px]">
                          {pmt.provider_reference ?? '—'}
                        </td>
                        <td className="px-4 py-3"><PaymentStatusBadge status={pmt.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(pmt.created_at)}</td>
                        <td className="px-4 py-3">
                          {pmt.status === 'completed' && pmt.provider !== 'mock' && (
                            <form action={async () => {
                              'use server'
                              await adminRefundPayment(pmt.id)
                            }}>
                              <Button type="submit" variant="outline" size="sm"
                                className="text-orange-600 border-orange-200 hover:bg-orange-50 text-xs h-7">
                                Refund
                              </Button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Failed Payment Queue ───────────────────────────────────────── */}
      {tab === 'failed' && (
        <div className="space-y-4">
          {(failedPayments?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                {failedPayments!.length} failed payment{failedPayments!.length !== 1 ? 's' : ''} require attention.
                Use &ldquo;Notify Retry&rdquo; to send the user an email prompt to re-attempt payment.
              </p>
            </div>
          )}

          {!failedPayments?.length ? <EmptyState message="No failed payments." /> : (
            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Provider</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {failedPayments.map((pmt: PaymentRow) => (
                      <tr key={pmt.id} className="hover:bg-muted/30 bg-red-50/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-xs">{pmt.user?.display_name ?? pmt.user?.full_name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{pmt.user?.email}</p>
                        </td>
                        <td className="px-4 py-3 font-medium">{formatXAF(pmt.amount)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{PROVIDER_LABELS[pmt.provider] ?? pmt.provider}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(pmt.created_at)}</td>
                        <td className="px-4 py-3">
                          <form action={async () => {
                            'use server'
                            await adminRetryPayment(pmt.id)
                          }}>
                            <Button type="submit" variant="outline" size="sm"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs h-7">
                              Notify Retry
                            </Button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Plans ──────────────────────────────────────────────────────── */}
      {tab === 'plans' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{plans?.length ?? 0} plans configured</p>
          {!plans?.length ? <EmptyState message="No plans found. Run the migration to seed default plans." /> : (
            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan Name</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {plans.map((plan: any) => (
                      <tr key={plan.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground capitalize">
                          {ROLE_LABELS[plan.role as UserRole] ?? plan.role}
                        </td>
                        <td className="px-4 py-3 font-medium">{plan.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {BILLING_TYPE_LABELS[plan.billing_type as keyof typeof BILLING_TYPE_LABELS] ?? plan.billing_type}
                        </td>
                        <td className="px-4 py-3">{formatXAF(plan.amount)}</td>
                        <td className="px-4 py-3">
                          {plan.is_active
                            ? <span className="text-xs text-emerald-600 font-medium">Yes</span>
                            : <span className="text-xs text-muted-foreground">No</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Revenue by Provider ────────────────────────────────────────── */}
      {tab === 'revenue' && (
        <div className="space-y-6">
          {/* KPI */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
              <p className="text-2xl font-bold mt-1">{formatXAF(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">Completed payments only</p>
            </div>
            {Object.entries(revenueByProvider).sort((a, b) => b[1] - a[1]).map(([prov, amount]) => (
              <div key={prov} className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground font-medium">{PROVIDER_LABELS[prov] ?? prov}</p>
                <p className="text-2xl font-bold mt-1">{formatXAF(amount)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalRevenue > 0 ? `${Math.round((amount / totalRevenue) * 100)}% of total` : '—'}
                </p>
              </div>
            ))}
          </div>

          {/* Provider breakdown table */}
          <div className="rounded-xl border overflow-hidden">
            <div className="px-5 py-3 border-b bg-muted/30">
              <h2 className="font-semibold text-sm">Revenue by Provider</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Provider</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Share</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payments</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.entries(revenueByProvider).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">No completed payments yet.</td></tr>
                )}
                {Object.entries(revenueByProvider)
                  .sort((a, b) => b[1] - a[1])
                  .map(([prov, amount]) => {
                    const count = (payments ?? []).filter(p => p.provider === prov && p.status === 'completed').length
                    return (
                      <tr key={prov} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{PROVIDER_LABELS[prov] ?? prov}</td>
                        <td className="px-4 py-3">{formatXAF(amount)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {totalRevenue > 0 ? `${Math.round((amount / totalRevenue) * 100)}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{count}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>

          <GrantActivationForm />
        </div>
      )}
    </div>
  )
}

// ─── Grant Activation Form ────────────────────────────────────────────────────

function GrantActivationForm() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <h3 className="text-sm font-semibold">Grant Manual Activation</h3>
      <p className="text-xs text-muted-foreground">
        Bypasses payment and grants an active subscription. Use for beta users, support cases, or admin-assigned accounts.
      </p>
      <form
        action={async (formData: FormData) => {
          'use server'
          const userId    = formData.get('user_id') as string
          const expiresAt = formData.get('expires_at') as string | null
          await adminGrantActivation({ user_id: userId, expires_at: expiresAt || null })
        }}
        className="flex gap-3 flex-wrap"
      >
        <input
          name="user_id"
          placeholder="User UUID"
          required
          className="flex-1 min-w-[240px] rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          name="expires_at"
          type="date"
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" size="sm">Grant Activation</Button>
      </form>
    </div>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed py-16 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid:    'bg-emerald-100 text-emerald-700',
    pending: 'bg-yellow-100 text-yellow-700',
    void:    'bg-gray-100 text-gray-500',
    overdue: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function PaymentStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700',
    pending:   'bg-yellow-100 text-yellow-700',
    failed:    'bg-red-100 text-red-700',
    refunded:  'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}
