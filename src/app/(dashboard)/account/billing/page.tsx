import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CheckCircle2, XCircle, Clock, CreditCard, FileText, RefreshCw, Download } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { getBillingStatus, getPlansForRole } from '@/lib/billing'
import { requiresActivationFee } from '@/lib/roles'
import { cancelSubscription, toggleAutoRenew } from '@/lib/actions/billing'
import { Button } from '@/components/ui/button'
import { formatXAF, formatDate } from '@/lib/utils/format'
import { PaymentProviderSelector } from '@/components/payments/PaymentProviderSelector'
import {
  BILLING_TYPE_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
} from '@/types/billing'
import type { Invoice, BillingPayment, SubscriptionPlan } from '@/types/billing'

export const metadata: Metadata = { title: 'Billing — LANDLORDZS' }

export default async function AccountBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>
}) {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  if (!requiresActivationFee(profile.role)) {
    redirect('/account/profile')
  }

  const { payment } = await searchParams
  const isDev = process.env.NODE_ENV === 'development'

  const supabase = await createClient()

  const [billingStatus, plans, invoicesRes, paymentsRes] = await Promise.all([
    getBillingStatus(profile.id, profile.role, supabase),
    getPlansForRole(profile.role, supabase),
    (supabase as any)
      .from('invoices')
      .select('*')
      .eq('user_id', profile.id)
      .order('issued_at', { ascending: false })
      .limit(20) as Promise<{ data: Invoice[] | null }>,
    (supabase as any)
      .from('payments')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20) as Promise<{ data: BillingPayment[] | null }>,
  ])

  const invoices = invoicesRes.data ?? []
  const payments = paymentsRes.data ?? []
  const sub      = billingStatus.subscription
  const plan     = billingStatus.plan

  const renewalDate = sub?.expires_at ? new Date(sub.expires_at) : null
  const isExpiringSoon =
    renewalDate &&
    billingStatus.hasActiveSubscription &&
    renewalDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000

  const activationPlan = plans.find(p => p.billing_type === 'one_time')
  const monthlyPlan    = plans.find(p => p.billing_type === 'monthly')
  const annualPlan     = plans.find(p => p.billing_type === 'annual')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription, invoices, and payment history.
        </p>
      </div>

      {/* Payment success banner */}
      {payment === 'success' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          Payment confirmed! Your account is now active.
        </div>
      )}

      {/* ── Account Status ────────────────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Account Status
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            {profile.account_status === 'active'
              ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              : <Clock className="h-5 w-5 text-yellow-500 shrink-0" />
            }
            <div>
              <p className="text-sm font-medium">Identity Verification</p>
              <p className="text-xs text-muted-foreground capitalize">
                {profile.account_status === 'active'
                  ? 'Verified'
                  : profile.account_status === 'pending_verification'
                  ? 'Under review'
                  : profile.account_status}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {billingStatus.hasActiveSubscription
              ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              : <XCircle className="h-5 w-5 text-red-400 shrink-0" />
            }
            <div>
              <p className="text-sm font-medium">Subscription</p>
              {sub ? (
                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${SUBSCRIPTION_STATUS_COLORS[sub.status]}`}>
                  {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                </span>
              ) : (
                <p className="text-xs text-muted-foreground">No subscription</p>
              )}
            </div>
          </div>
        </div>

        {!billingStatus.hasActiveSubscription && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Publishing is locked. Pay the activation fee or subscribe to publish listings, portfolios, and service requests.
          </div>
        )}

        {isExpiringSoon && renewalDate && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            Your subscription renews on {formatDate(renewalDate.toISOString())}. Renew early to avoid interruption.
          </div>
        )}
      </section>

      {/* ── Current Plan ──────────────────────────────────────────────────── */}
      {sub && plan && (
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Current Plan
          </h2>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-base">{plan.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatXAF(plan.amount)} · {BILLING_TYPE_LABELS[plan.billing_type]}
              </p>
              {renewalDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  {plan.billing_type === 'one_time'
                    ? 'One-time fee — no renewal required'
                    : `Renews: ${formatDate(renewalDate.toISOString())}`}
                </p>
              )}
            </div>
            {sub.status === 'active' && plan.billing_type !== 'one_time' && (
              <div className="flex gap-2">
                <form action={async () => {
                  'use server'
                  await toggleAutoRenew({ subscription_id: sub.id, auto_renew: !sub.auto_renew })
                }}>
                  <Button type="submit" variant="outline" size="sm">
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    {sub.auto_renew ? 'Disable Auto-renew' : 'Enable Auto-renew'}
                  </Button>
                </form>
                <form action={async () => {
                  'use server'
                  await cancelSubscription(sub.id)
                }}>
                  <Button type="submit" variant="outline" size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50">
                    Cancel
                  </Button>
                </form>
              </div>
            )}
          </div>

          {plan.features.length > 0 && (
            <ul className="space-y-1">
              {plan.features.map((f: string) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── Choose a Plan ─────────────────────────────────────────────────── */}
      {!billingStatus.hasActiveSubscription && plans.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Choose a Plan
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[activationPlan, monthlyPlan, annualPlan]
              .filter((p): p is SubscriptionPlan => p !== undefined)
              .map(p => (
                <PlanCard key={p.id} plan={p} isDev={isDev} />
              ))}
          </div>
        </section>
      )}

      {/* ── Upgrade options ───────────────────────────────────────────────── */}
      {billingStatus.hasActiveSubscription && sub && plan?.billing_type === 'one_time' &&
        plans.filter(p => p.billing_type !== 'one_time').length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Upgrade to Recurring Plan
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {plans
              .filter(p => p.billing_type !== 'one_time')
              .map(p => <PlanCard key={p.id} plan={p} isDev={isDev} />)}
          </div>
        </section>
      )}

      {/* ── Invoices ──────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Invoices
        </h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No invoices yet.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.issued_at)}</td>
                    <td className="px-4 py-3 font-medium">{formatXAF(inv.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${INVOICE_STATUS_COLORS[inv.status]}`}>
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/api/invoice/${inv.id}?print=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Payment History ───────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Payment History
        </h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No payments recorded yet.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Provider</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map(pmt => (
                  <tr key={pmt.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(pmt.created_at)}</td>
                    <td className="px-4 py-3 font-medium">{formatXAF(pmt.amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">
                      {PROVIDER_LABELS[pmt.provider] ?? pmt.provider}
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={pmt.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, isDev }: { plan: SubscriptionPlan; isDev: boolean }) {
  const isAnnual = plan.billing_type === 'annual'
  return (
    <div className={`rounded-xl border p-5 space-y-4 flex flex-col ${isAnnual ? 'border-primary ring-1 ring-primary/30' : ''}`}>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm">{BILLING_TYPE_LABELS[plan.billing_type]}</p>
          {isAnnual && (
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
              Best Value
            </span>
          )}
        </div>
        <p className="text-2xl font-bold mt-1">{formatXAF(plan.amount)}</p>
        <p className="text-xs text-muted-foreground">
          {plan.billing_type === 'one_time' ? 'one-time' : `per ${plan.billing_type === 'monthly' ? 'month' : 'year'}`}
        </p>
      </div>

      {plan.features.length > 0 && (
        <ul className="flex-1 space-y-1">
          {plan.features.map((f: string) => (
            <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
      )}

      <PaymentProviderSelector plan={plan} isDev={isDev} />
    </div>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  stripe:       'Stripe',
  paypal:       'PayPal',
  mtn_momo:     'MTN MoMo',
  orange_money: 'Orange Money',
  mock:         'Test (Mock)',
  wallet:       'Wallet',
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
