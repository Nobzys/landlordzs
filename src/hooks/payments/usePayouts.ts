'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/authStore'
import type { PayoutRow } from '@/types/payment'

async function fetchMyPayouts(): Promise<PayoutRow[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await (supabase as any)
    .from('payouts')
    .select('*')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export function usePayouts() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  return useQuery({
    queryKey: queryKeys.payouts.list(),
    queryFn:  fetchMyPayouts,
    enabled:  isAuthenticated,
  })
}
