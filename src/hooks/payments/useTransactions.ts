'use client'

import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/authStore'
import type { TransactionWithParties } from '@/types/payment'

const PAGE_SIZE = 20

async function fetchTransactions(page: number): Promise<{ items: TransactionWithParties[]; total: number }> {
  const supabase = createClient()
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { items: [], total: 0 }

  const { data, count, error } = await (supabase as any)
    .from('transactions')
    .select(`
      *,
      payer:profiles!transactions_payer_id_fkey(id, full_name, display_name, avatar_url),
      payee:profiles!transactions_payee_id_fkey(id, full_name, display_name, avatar_url)
    `, { count: 'exact' })
    .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)
  return { items: data ?? [], total: count ?? 0 }
}

export function useTransactions() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())

  return useInfiniteQuery({
    queryKey: queryKeys.transactions.list(),
    queryFn:  ({ pageParam }) => fetchTransactions(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.items.length, 0)
      return loaded < lastPage.total ? allPages.length + 1 : undefined
    },
    enabled: isAuthenticated,
  })
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: queryKeys.transactions.detail(id),
    queryFn:  async () => {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('transactions')
        .select(`
          *,
          payer:profiles!transactions_payer_id_fkey(id, full_name, display_name, avatar_url),
          payee:profiles!transactions_payee_id_fkey(id, full_name, display_name, avatar_url)
        `)
        .eq('id', id)
        .single()
      if (error) return null
      return data as TransactionWithParties
    },
    enabled: !!id,
  })
}
