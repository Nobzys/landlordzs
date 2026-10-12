'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PaymentMethodSelector } from './PaymentMethodSelector'
import { useTopUpWallet, useRetryPayment } from '@/hooks/payments/usePaymentMutations'
import { usePaymentStatus } from '@/hooks/payments/usePaymentStatus'
import { formatXAF } from '@/lib/utils/format'
import { toast } from 'sonner'

const QUICK_AMOUNTS = [5_000, 10_000, 25_000, 50_000, 100_000, 500_000]
const THREE_MINUTES_MS = 3 * 60 * 1000

const schema = z.object({
  amount:   z.number().int().positive().min(500, 'Minimum 500 XAF'),
  provider: z.enum(['mtn_momo', 'orange_money'] as const),
  phone:    z.string().regex(/^\+237[6-9]\d{8}$/, 'Invalid phone number'),
})
type FormValues = z.infer<typeof schema>

export function WalletTopUpForm({ onSuccess }: { onSuccess?: () => void }) {
  const [txnId, setTxnId]           = useState<string | null>(null)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  // originalTransactionId of the failed txn being retried (null = fresh payment)
  const [retryOfTxnId, setRetryOfTxnId] = useState<string | null>(null)
  // Snapshot of the last submitted amount/provider for pre-populating retry form
  const [lastSubmit, setLastSubmit] = useState<{ amount: number; provider: FormValues['provider'] } | null>(null)
  // Wall-clock 'now' updated every 30 s while polling — drives the timeout warning
  const [now, setNow] = useState<number>(() => Date.now())
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null)

  const topUp      = useTopUpWallet()
  const retryTopUp = useRetryPayment()

  const { isPolling, isSuccessful, isFailed } = usePaymentStatus(txnId, {
    onSuccess: () => {
      toast.success('Wallet topped up successfully!')
      onSuccess?.()
    },
    onFailure: () => toast.error('Payment failed. Please try again.'),
  })

  // Record when polling begins; clear when txnId is cleared
  useEffect(() => {
    if (txnId) {
      const t = Date.now()
      setPollingStartTime(t)
      setNow(t)
    } else {
      setPollingStartTime(null)
    }
  }, [txnId])

  // Refresh 'now' every 30 s while actively polling so the timeout message appears
  useEffect(() => {
    if (!isPolling) return
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [isPolling])

  const isLate = isPolling && pollingStartTime !== null && (now - pollingStartTime) > THREE_MINUTES_MS

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { provider: 'mtn_momo' },
  })

  const provider = watch('provider')
  const amount   = watch('amount')

  const onSubmit = async (data: FormValues) => {
    let result
    if (retryOfTxnId) {
      // Server reads amount + provider from DB; phone is re-supplied by the user
      result = await retryTopUp.mutateAsync({ originalTransactionId: retryOfTxnId, phone: data.phone })
    } else {
      result = await topUp.mutateAsync({ amount: data.amount, provider: data.provider, phone: data.phone })
    }
    if (result.error) return
    if (result.data?.transaction_id) {
      setLastSubmit({ amount: data.amount, provider: data.provider })
      setTxnId(result.data.transaction_id)
      if (result.data.payment_url) {
        setPaymentUrl(result.data.payment_url)
        window.open(result.data.payment_url, '_blank', 'noopener,noreferrer')
      }
    }
  }

  const isPending = topUp.isPending || retryTopUp.isPending

  if (isSuccessful) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        <div>
          <p className="font-semibold text-lg">Payment Successful!</p>
          <p className="text-sm text-muted-foreground">Your wallet has been topped up.</p>
        </div>
        <Button onClick={() => { setTxnId(null); setRetryOfTxnId(null); onSuccess?.() }}>Done</Button>
      </div>
    )
  }

  if (isFailed) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <XCircle className="h-16 w-16 text-destructive" />
        <div>
          <p className="font-semibold text-lg">Payment Failed</p>
          <p className="text-sm text-muted-foreground">Please check your phone and try again.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setRetryOfTxnId(txnId)
            setTxnId(null)
            setPaymentUrl(null)
            if (lastSubmit) {
              setValue('amount', lastSubmit.amount)
              setValue('provider', lastSubmit.provider)
            }
          }}
        >
          Try Again
        </Button>
      </div>
    )
  }

  if (isPolling) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
        <div>
          <p className="font-semibold text-lg">Awaiting Payment</p>
          {paymentUrl ? (
            <p className="text-sm text-muted-foreground">
              Complete your payment in the tab that just opened, then wait here.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Check your phone for the MTN MoMo prompt.
            </p>
          )}
          {amount && <p className="text-blue-700 font-semibold mt-1">{formatXAF(amount)}</p>}
        </div>
        {paymentUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(paymentUrl, '_blank', 'noopener,noreferrer')}
          >
            Reopen payment page
          </Button>
        )}
        {isLate && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Payment is taking longer than expected. Still checking…</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Do not close this page</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {retryOfTxnId && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
          Retrying your previous payment — amount and method are pre-filled. Re-enter your phone number to continue.
        </div>
      )}

      {/* Quick amounts */}
      <div className="space-y-2">
        <Label>Amount (XAF)</Label>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_AMOUNTS.map(a => (
            <button
              key={a}
              type="button"
              disabled={!!retryOfTxnId}
              onClick={() => setValue('amount', a)}
              className="rounded-lg border py-2 text-sm hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formatXAF(a)}
            </button>
          ))}
        </div>
        <Input
          type="number"
          placeholder="Or enter custom amount"
          disabled={!!retryOfTxnId}
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
      </div>

      {/* Provider */}
      <div className="space-y-2">
        <Label>Payment Method</Label>
        <PaymentMethodSelector
          value={provider}
          onChange={v => !retryOfTxnId && setValue('provider', v as any)}
          amount={amount}
          exclude={['wallet']}
          disabled={!!retryOfTxnId}
        />
        {errors.provider && <p className="text-xs text-destructive">{errors.provider.message}</p>}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label>Mobile Number</Label>
        <Input
          placeholder={provider === 'mtn_momo' ? '+237 650 000 000' : '+237 655 000 000'}
          {...register('phone')}
        />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {amount ? `Top Up ${formatXAF(amount)}` : 'Top Up Wallet'}
      </Button>
    </form>
  )
}
