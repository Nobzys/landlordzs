'use client'

import Image from 'next/image'
import { Wallet } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useWallet } from '@/hooks/payments/useWallet'
import { formatXAF } from '@/lib/utils/format'
import type { PaymentProvider } from '@/types/payment'

type SelectableProvider = 'mtn_momo' | 'orange_money' | 'wallet'

interface PaymentMethodSelectorProps {
  value: SelectableProvider | null
  onChange: (p: SelectableProvider) => void
  amount?: number
  disabled?: boolean
}

const METHODS: { id: SelectableProvider; label: string; sub: string }[] = [
  { id: 'mtn_momo',      label: 'MTN Mobile Money', sub: '+237 650/670/680…' },
  { id: 'orange_money',  label: 'Orange Money',      sub: '+237 655/675…' },
  { id: 'wallet',        label: 'LANDLORDZS Wallet', sub: 'Instant, no fees' },
]

export function PaymentMethodSelector({ value, onChange, amount, disabled }: PaymentMethodSelectorProps) {
  const { data: wallet } = useWallet()
  const walletBalance = (wallet?.balance ?? 0) - (wallet?.locked ?? 0)

  return (
    <div className="space-y-2">
      {METHODS.map(m => {
        const isWallet  = m.id === 'wallet'
        const insufficient = isWallet && amount !== undefined && walletBalance < amount
        const isDisabled = disabled || (isWallet && insufficient)
        const isSelected = value === m.id

        return (
          <button
            key={m.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onChange(m.id)}
            className={cn(
              'w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
              isSelected
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                : 'border-muted hover:border-blue-300',
              isDisabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {/* Icon */}
            <div className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
              m.id === 'mtn_momo'     ? 'bg-yellow-400'  :
              m.id === 'orange_money' ? 'bg-orange-500'  : 'bg-blue-600'
            )}>
              {m.id === 'wallet'
                ? <Wallet className="h-5 w-5 text-white" />
                : <span className="text-xs font-bold text-white">{m.id === 'mtn_momo' ? 'MTN' : 'OM'}</span>
              }
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{m.label}</p>
              <p className="text-xs text-muted-foreground">
                {isWallet ? formatXAF(walletBalance) : m.sub}
              </p>
              {isWallet && insufficient && (
                <p className="text-xs text-destructive mt-0.5">
                  Insufficient balance — top up first
                </p>
              )}
            </div>

            <div className={cn(
              'h-4 w-4 rounded-full border-2 shrink-0 transition-colors',
              isSelected ? 'border-blue-600 bg-blue-600' : 'border-muted-foreground'
            )} />
          </button>
        )
      })}
    </div>
  )
}
