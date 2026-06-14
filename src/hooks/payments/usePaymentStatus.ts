'use client'

import { useQuery } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'

type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded'

async function fetchTransactionStatus(id: string): Promise<PaymentStatus> {
  const res = await fetch(`/api/payments/status/${id}`, { cache: 'no-store' })
  if (!res.ok) return 'processing'
  const json = await res.json()
  return (json.status ?? 'processing') as PaymentStatus
}

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'refunded'])

export function usePaymentStatus(transactionId: string | null, options?: {
  onSuccess?: () => void
  onFailure?: () => void
}) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.transactions.status(transactionId ?? ''),
    queryFn:  () => fetchTransactionStatus(transactionId!),
    enabled:  !!transactionId,
    // Poll every 3 seconds while processing
    refetchInterval: (data) => {
      const status = data.state.data as PaymentStatus | undefined
      return status && TERMINAL_STATUSES.has(status) ? false : 3000
    },
    staleTime: 0,
  })

  useEffect(() => {
    const status = query.data as PaymentStatus | undefined
    if (!status || !TERMINAL_STATUSES.has(status)) return

    if (status === 'completed') {
      qc.invalidateQueries({ queryKey: queryKeys.wallet.balance() })
      qc.invalidateQueries({ queryKey: queryKeys.transactions.list() })
      qc.invalidateQueries({ queryKey: queryKeys.escrow.list() })
      options?.onSuccess?.()
    } else if (status === 'failed') {
      options?.onFailure?.()
    }
  }, [query.data])

  const isPolling    = !!transactionId && !TERMINAL_STATUSES.has((query.data ?? 'pending') as PaymentStatus)
  const isSuccessful = query.data === 'completed'
  const isFailed     = query.data === 'failed' || query.data === 'cancelled'

  return { status: query.data as PaymentStatus | undefined, isPolling, isSuccessful, isFailed }
}
