'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/authStore'
import type { WalletRow, WalletTransactionRow } from '@/types/payment'

async function fetchWallet(): Promise<WalletRow | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .single()

  if (error) return null
  return data as unknown as WalletRow
}

async function fetchWalletTransactions(): Promise<WalletTransactionRow[]> {
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('wallet_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return []
  return data ?? []
}

export function useWallet() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  return useQuery({
    queryKey: queryKeys.wallet.balance(),
    queryFn:  fetchWallet,
    enabled:  isAuthenticated,
    staleTime: 30 * 1000,
  })
}

export function useWalletTransactions() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  return useQuery({
    queryKey: queryKeys.wallet.transactions(),
    queryFn:  fetchWalletTransactions,
    enabled:  isAuthenticated,
  })
}
