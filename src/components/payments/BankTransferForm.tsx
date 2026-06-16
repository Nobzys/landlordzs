'use client'

import { useState, useTransition } from 'react'
import { Building2, Copy, CheckCircle2, Loader2, AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  initiateBankTransfer,
  submitBankTransferReference,
} from '@/lib/actions/bank-transfer'
import type { BankDetails } from '@/lib/payments/types'
import type { SubscriptionPlan } from '@/types/billing'
import { formatXAF } from '@/lib/utils/format'

type Step = 'select' | 'details' | 'reference' | 'submitted'

interface Props {
  plan:    SubscriptionPlan
}

export function BankTransferForm({ plan }: Props) {
  const [step, setStep]               = useState<Step>('select')
  const [paymentId, setPaymentId]     = useState<string | null>(null)
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null)
  const [reference, setReference]     = useState('')
  const [copied, setCopied]           = useState<string | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  function handleInitiate() {
    setError(null)
    startTransition(async () => {
      const res = await initiateBankTransfer({ plan_id: plan.id })
      if (res.error) { setError(res.error); return }
      setPaymentId(res.data!.paymentId)
      setBankDetails(res.data!.bankDetails)
      setStep('details')
    })
  }

  function handleSubmitReference() {
    if (!paymentId) return
    const ref = reference.trim()
    if (!ref) { setError('Please enter your bank transfer reference number.'); return }
    setError(null)
    startTransition(async () => {
      const res = await submitBankTransferReference({ paymentId, reference: ref })
      if (res.error) { setError(res.error); return }
      setStep('submitted')
    })
  }

  if (step === 'select') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-blue-50 border-blue-200 p-4 flex gap-3">
          <Building2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900">Bank Transfer</p>
            <p className="text-xs text-blue-700">
              Transfer {formatXAF(plan.amount)} to our account. Your subscription will be activated
              within 1–2 business days after your transfer is verified.
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button
          type="button"
          onClick={handleInitiate}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Getting bank details…</>
          ) : (
            'Get Bank Details'
          )}
        </Button>
      </div>
    )
  }

  if (step === 'details' && bankDetails) {
    return (
      <div className="space-y-5">
        {/* Bank account card */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">Transfer to this account</h3>
          </div>

          <div className="space-y-3 text-sm">
            <BankField
              label="Account Name"
              value={bankDetails.accountName}
              fieldKey="name"
              copied={copied}
              onCopy={copyToClipboard}
            />
            <BankField
              label="Account Number"
              value={bankDetails.accountNumber}
              fieldKey="number"
              copied={copied}
              onCopy={copyToClipboard}
            />
            <BankField
              label="Bank"
              value={bankDetails.bankName}
              fieldKey="bank"
              copied={copied}
              onCopy={copyToClipboard}
            />
            {bankDetails.swiftCode && (
              <BankField
                label="SWIFT / BIC"
                value={bankDetails.swiftCode}
                fieldKey="swift"
                copied={copied}
                onCopy={copyToClipboard}
              />
            )}
            <BankField
              label="Amount"
              value={formatXAF(plan.amount)}
              fieldKey="amount"
              copied={copied}
              onCopy={copyToClipboard}
            />
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">{bankDetails.instructions}</p>
          </div>
        </div>

        {/* Reference submission */}
        <div className="space-y-3">
          <p className="text-sm font-medium">
            After making the transfer, enter your bank reference number:
          </p>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. TXN123456789 or FT2024XXXXXX"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep('select')}
              disabled={isPending}
            >
              Back
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleSubmitReference}
              disabled={isPending || !reference.trim()}
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting…</>
              ) : (
                "I've made the transfer"
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'submitted') {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="flex justify-center">
          <Clock className="h-12 w-12 text-blue-500" />
        </div>
        <h3 className="text-base font-semibold">Transfer reference submitted</h3>
        <p className="text-sm text-muted-foreground">
          We&apos;ll verify your payment within 1–2 business days. You&apos;ll receive a notification once your account is activated.
        </p>
        <a
          href="/account/billing"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          View billing status
        </a>
      </div>
    )
  }

  return null
}

// ─── Field row ─────────────────────────────────────────────────────────────────

function BankField({
  label,
  value,
  fieldKey,
  copied,
  onCopy,
}: {
  label:    string
  value:    string
  fieldKey: string
  copied:   string | null
  onCopy:   (value: string, key: string) => void
}) {
  return (
    <div className="flex justify-between items-center gap-3 py-1 border-b last:border-b-0">
      <span className="text-muted-foreground text-xs w-28 shrink-0">{label}</span>
      <span className="font-mono font-medium flex-1 text-right break-all">{value}</span>
      <button
        type="button"
        onClick={() => onCopy(value, fieldKey)}
        className="shrink-0 p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
        title="Copy"
      >
        {copied === fieldKey
          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}
