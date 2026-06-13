'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/authStore'
import type { CommissionRecordRow } from '@/types/payment'

async function fetchMyCommissions(): Promise<CommissionRecordRow[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await (supabase as any)
    .from('commission_records')
    .select('*')
    .eq('earner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export function useCommissions() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  return useQuery({
    queryKey: queryKeys.commissions.list(),
    queryFn:  fetchMyCommissions,
    enabled:  isAuthenticated,
  })
}

export function useCommissionSummary() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  return useQuery({
    queryKey: queryKeys.commissions.summary(),
    queryFn:  async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data } = await (supabase as any)
        .from('commission_records')
        .select('amount, status')
        .eq('earner_id', user.id)

      const rows   = (data ?? []) as Array<{ amount: number; status: string }>
      const pending = rows.filter(r => r.status === 'pending')
      const paid    = rows.filter(r => r.status === 'paid')

      return {
        pending_count:  pending.length,
        paid_count:     paid.length,
        pending_amount: pending.reduce((s, r) => s + r.amount, 0),
        paid_amount:    paid.reduce((s, r) => s + r.amount, 0),
        total_earned:   rows.filter(r => r.status !== 'cancelled').reduce((s, r) => s + r.amount, 0),
      }
    },
    enabled: isAuthenticated,
  })
}
