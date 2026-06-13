'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PaymentMethodSelector } from './PaymentMethodSelector'
import { useWallet } from '@/hooks/payments/useWallet'
import { useRequestPayout } from '@/hooks/payments/usePaymentMutations'
import { requestPayoutSchema, type RequestPayoutInput } from '@/lib/validations/payment'
import { formatXAF } from '@/lib/utils/format'

export function PayoutRequestForm({ onSuccess }: { onSuccess?: () => void }) {
  const { data: wallet } = useWallet()
  const available = (wallet?.balance ?? 0) - (wallet?.locked ?? 0)
  const requestPayout = useRequestPayout()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RequestPayoutInput>({
    resolver: zodResolver(requestPayoutSchema),
    defaultValues: { provider: 'mtn_momo' },
  })

  const provider = watch('provider')
  const amount   = watch('amount')

  const onSubmit = async (data: RequestPayoutInput) => {
    if (data.amount > available) {
      toast.error(`Maximum payout is ${formatXAF(available)}`)
      return
    }
    const result = await requestPayout.mutateAsync(data)
    if (!result.error) {
      toast.success('Payout requested!')
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="rounded-lg bg-muted px-4 py-3 text-sm">
        <span className="text-muted-foreground">Available to withdraw: </span>
        <span className="font-semibold">{formatXAF(available)}</span>
      </div>

      <div className="space-y-1.5">
        <Label>Amount (XAF)</Label>
        <Input
          type="number"
          placeholder="Enter amount"
          min={1000}
          max={available}
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Withdraw To</Label>
        <PaymentMethodSelector
          value={provider}
          onChange={v => v !== 'wallet' && setValue('provider', v as any)}
          amount={amount}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Mobile Number</Label>
          <Input
            placeholder={provider === 'mtn_momo' ? '+237 650…' : '+237 655…'}
            {...register('phone')}
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Account Name (optional)</Label>
          <Input placeholder="Full name" {...register('name')} />
        </div>
      </div>

      {amount > 0 && (
        <div className="rounded-lg bg-muted text-sm px-4 py-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount requested</span>
            <span>{formatXAF(amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Processing fee (1%)</span>
            <span>-{formatXAF(Math.round(amount * 0.01))}</span>
          </div>
          <div className="flex justify-between font-medium border-t pt-1 mt-1">
            <span>You receive</span>
            <span>{formatXAF(Math.round(amount * 0.99))}</span>
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={requestPayout.isPending || available < 1000}>
        {requestPayout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Request Payout
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Payouts are processed within 1–2 business days after admin approval.
      </p>
    </form>
  )
}
