'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { CreditCard, Smartphone, Loader2, CheckCircle2, Building2, Globe2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  createStripeCheckoutSession,
  createPayPalOrder,
  initiateMobileMoneySubscription,
  pollMobileMoneyStatus,
  subscribeToPlan,
} from '@/lib/actions/billing'
import { BankTransferForm } from '@/components/payments/BankTransferForm'
import type { SubscriptionPlan } from '@/types/billing'
import { formatXAF } from '@/lib/utils/format'

// ─── Provider logo components ─────────────────────────────────────────────────

function StripeLogo() {
  return (
    <svg viewBox="0 0 60 25" className="h-5 w-auto" aria-label="Stripe" fill="currentColor">
      <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a14.4 14.4 0 01-4.69.82c-4.45 0-7.37-2.82-7.37-7.54C46.77 8.59 49.6 5.5 53.8 5.5c3.82 0 5.93 2.61 5.93 6.78l-.09 2zm-5.92-4.43c-1.04 0-2.17.73-2.17 2.29h4.3c0-1.56-1.05-2.29-2.13-2.29zm-12.52-4.35a5.9 5.9 0 00-3.48 1.1V0h-4.26v19.53h4.26v-1.14c.96.97 2.19 1.48 3.48 1.48 3.46 0 5.9-2.79 5.9-7.56 0-4.76-2.44-7.81-5.9-7.81zm-.7 11.7c-1.34 0-2.16-.89-2.16-4.13 0-3.24.82-4.13 2.16-4.13 1.33 0 2.15.89 2.15 4.13 0 3.24-.82 4.13-2.15 4.13zm-15.95.47c-.7 0-1.4-.2-1.88-.47V5.87h-4.25v14.59c1.15.53 2.79 1.07 4.58 1.07 3.9 0 6.34-2.04 6.34-7.25V5.87h-4.25v7.88c0 2.73-.94 3.92-2.54 3.92zm-13.8-4.58c0 1.1.74 1.54 1.87 1.54.9 0 1.72-.3 2.48-.7v3.34c-.91.42-2 .66-3.28.66-2.76 0-5.18-1.42-5.18-4.95V9.31H4.34V5.87h2.4V2.4L10.97 1v4.87h3.55v3.44h-3.55v5.98c0 .01-.02.49-.02.85z"/>
    </svg>
  )
}

function PayPalLogo() {
  return (
    <svg viewBox="0 0 101 32" className="h-5 w-auto" aria-label="PayPal">
      <path fill="#003087" d="M12.237 2.8C11.128 2.8 10.184 3.55 10.02 4.645l-4.047 25.71c-.129.832.48 1.588 1.315 1.588h6.115c.988 0 1.83-.721 1.983-1.698l1.122-7.131c.153-.977.996-1.699 1.983-1.699h5.105c5.986 0 10.696-2.7 12.204-10.37C36.084 5.35 30.24 2.8 23.65 2.8H12.237z"/>
      <path fill="#009cde" d="M56.18 2.8c-1.11 0-2.053.75-2.218 1.845L49.916 30.354c-.129.832.48 1.588 1.315 1.588h5.777c.988 0 1.83-.721 1.983-1.699l4.047-25.71c.129-.832-.48-1.588-1.315-1.588H56.18v-.145z"/>
      <path fill="#001c64" d="M35.21 11.6c-.99 5.85-5.994 9.2-12.31 9.2h-3.11c-.988 0-1.83.721-1.983 1.699l-2.01 12.77c-.113.72.441 1.375 1.163 1.375h5.32c.862 0 1.596-.627 1.73-1.48l.072-.367.984-6.24.063-.345c.134-.852.868-1.479 1.73-1.479h1.09c5.988 0 10.68-2.432 12.05-9.46.572-2.936.275-5.387-1.226-7.11-.464-.527-1.03-.956-1.563-1.363z"/>
    </svg>
  )
}

// ─── Provider type ────────────────────────────────────────────────────────────

type Provider = 'mtn_momo' | 'orange_money' | 'bank_transfer' | 'stripe' | 'paypal' | 'mock'

interface ProviderOption {
  id:       Provider
  label:    string
  icon:     React.ReactNode
  desc:     string
  devOnly?: boolean
}

interface Props {
  plan:   SubscriptionPlan
  isDev?: boolean
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PaymentProviderSelector({ plan, isDev = false }: Props) {
  const [selected, setSelected]           = useState<Provider>('mtn_momo')
  const [phone, setPhone]                 = useState('')
  const [error, setError]                 = useState<string | null>(null)
  const [momoPaymentId, setMomoPaymentId] = useState<string | null>(null)
  const [momoStatus, setMomoStatus]       = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle')
  const [isPending, startTransition]      = useTransition()
  const pollInterval                      = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (pollInterval.current) clearInterval(pollInterval.current) }
  }, [])

  useEffect(() => {
    if (!momoPaymentId || momoStatus !== 'pending') return

    pollInterval.current = setInterval(() => {
      startTransition(async () => {
        const res = await pollMobileMoneyStatus(momoPaymentId)
        if (res.data?.status === 'completed') {
          setMomoStatus('completed')
          clearInterval(pollInterval.current!)
          window.location.href = '/account/billing?payment=success'
        } else if (res.data?.status === 'failed') {
          setMomoStatus('failed')
          setError('Mobile money payment was declined or timed out.')
          clearInterval(pollInterval.current!)
        }
      })
    }, 5000)

    return () => { if (pollInterval.current) clearInterval(pollInterval.current) }
  }, [momoPaymentId, momoStatus])

  function handlePay() {
    setError(null)
    startTransition(async () => {
      try {
        if (selected === 'stripe') {
          const res = await createStripeCheckoutSession({ plan_id: plan.id })
          if (res.error) { setError(res.error); return }
          window.location.href = res.data!.url
          return
        }

        if (selected === 'paypal') {
          const res = await createPayPalOrder({ plan_id: plan.id })
          if (res.error) { setError(res.error); return }
          window.location.href = res.data!.url
          return
        }

        if (selected === 'mtn_momo' || selected === 'orange_money') {
          if (!phone.trim()) { setError('Please enter your mobile money phone number.'); return }
          const res = await initiateMobileMoneySubscription({
            plan_id:         plan.id,
            mobile_provider: selected,
            phone:           phone.trim(),
          })
          if (res.error) { setError(res.error); return }
          setMomoPaymentId(res.data!.paymentId)
          setMomoStatus('pending')
          return
        }

        if (selected === 'mock') {
          const res = await subscribeToPlan({ plan_id: plan.id, provider: 'mock' })
          if (res.error) { setError(res.error); return }
          window.location.href = '/account/billing?payment=success'
          return
        }
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  if (momoStatus === 'pending') {
    return (
      <div className="space-y-3 text-center py-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm font-medium">Waiting for payment confirmation</p>
        <p className="text-xs text-muted-foreground">
          Check your phone and approve the {selected === 'mtn_momo' ? 'MTN Mobile Money' : 'Orange Money'} request.
        </p>
        <p className="text-xs text-muted-foreground">This page will update automatically.</p>
      </div>
    )
  }

  if (momoStatus === 'completed') {
    return (
      <div className="space-y-3 text-center py-4">
        <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
        <p className="text-sm font-medium text-emerald-700">Payment confirmed! Redirecting…</p>
      </div>
    )
  }

  const localProviders: ProviderOption[] = [
    {
      id:    'mtn_momo',
      label: 'MTN Mobile Money',
      icon:  <Smartphone className="h-5 w-5 text-yellow-500" />,
      desc:  'Pay via MTN MoMo (push to phone)',
    },
    {
      id:    'orange_money',
      label: 'Orange Money',
      icon:  <Smartphone className="h-5 w-5 text-orange-500" />,
      desc:  'Pay via Orange Money (push to phone)',
    },
    {
      id:    'bank_transfer',
      label: 'Bank Transfer',
      icon:  <Building2 className="h-5 w-5 text-blue-500" />,
      desc:  'Transfer to our bank account — verified within 1–2 business days',
    },
  ]

  const internationalProviders: ProviderOption[] = [
    {
      id:    'stripe',
      label: 'Card / Apple Pay / Google Pay',
      icon:  <StripeLogo />,
      desc:  'Visa, Mastercard, Apple Pay, Google Pay',
    },
    {
      id:    'paypal',
      label: 'PayPal',
      icon:  <PayPalLogo />,
      desc:  'Pay with your PayPal account',
    },
  ]

  const devProviders: ProviderOption[] = isDev ? [{
    id:      'mock' as const,
    label:   'Mock (Dev only)',
    icon:    <CreditCard className="h-5 w-5 text-gray-400" />,
    desc:    'Instant success — for development/testing',
    devOnly: true,
  }] : []

  const needsPhone = selected === 'mtn_momo' || selected === 'orange_money'

  return (
    <div className="space-y-4">
      {/* ── Local payment methods ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Cameroon
        </p>
        {localProviders.map((p) => (
          <ProviderButton
            key={p.id}
            provider={p}
            selected={selected}
            onSelect={(id) => { setSelected(id); setError(null) }}
          />
        ))}
      </div>

      {/* ── Phone field for Mobile Money ── */}
      {needsPhone && (
        <div>
          <label htmlFor="momo-phone" className="block text-xs font-medium text-muted-foreground mb-1">
            {selected === 'mtn_momo' ? 'MTN' : 'Orange'} phone number
          </label>
          <input
            id="momo-phone"
            type="tel"
            placeholder="+237 6XX XXX XXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {/* ── Bank Transfer inline form ── */}
      {selected === 'bank_transfer' && (
        <BankTransferForm plan={plan} />
      )}

      {/* ── International payment methods ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            International payments
          </p>
        </div>
        {internationalProviders.map((p) => (
          <ProviderButton
            key={p.id}
            provider={p}
            selected={selected}
            onSelect={(id) => { setSelected(id); setError(null) }}
          />
        ))}
      </div>

      {/* ── Dev mock ── */}
      {devProviders.map((p) => (
        <ProviderButton
          key={p.id}
          provider={p}
          selected={selected}
          onSelect={(id) => { setSelected(id); setError(null) }}
        />
      ))}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* ── Pay button (not shown for bank_transfer — it has its own form) ── */}
      {selected !== 'bank_transfer' && (
        <Button
          type="button"
          onClick={handlePay}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing…
            </>
          ) : (
            `Pay ${formatXAF(plan.amount)}`
          )}
        </Button>
      )}
    </div>
  )
}

// ─── Provider button ──────────────────────────────────────────────────────────

function ProviderButton({
  provider,
  selected,
  onSelect,
}: {
  provider: ProviderOption
  selected: Provider
  onSelect: (id: Provider) => void
}) {
  const isSelected = selected === provider.id
  return (
    <button
      type="button"
      onClick={() => onSelect(provider.id)}
      className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'border-border hover:bg-muted/40'
      } ${provider.devOnly ? 'opacity-60' : ''}`}
    >
      <div className="shrink-0 text-foreground">{provider.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{provider.label}</p>
        <p className="text-xs text-muted-foreground">{provider.desc}</p>
      </div>
      <div className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
        isSelected ? 'border-primary' : 'border-muted-foreground/40'
      }`}>
        {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
      </div>
    </button>
  )
}
