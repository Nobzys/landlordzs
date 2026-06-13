'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/authStore'
import type { EscrowWithDetails, EscrowAccountRow } from '@/types/payment'

async function fetchMyEscrows(): Promise<EscrowAccountRow[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await (supabase as any)
    .from('escrow_accounts')
    .select('*')
    .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

async function fetchEscrowDetail(id: string): Promise<EscrowWithDetails | null> {
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('escrow_accounts')
    .select(`
      *,
      milestones:escrow_milestones(*),
      events:escrow_events(*),
      payer:profiles!escrow_accounts_payer_id_fkey(id, full_name, display_name, avatar_url),
      payee:profiles!escrow_accounts_payee_id_fkey(id, full_name, display_name, avatar_url)
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return data as EscrowWithDetails
}

export function useEscrows() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  return useQuery({
    queryKey: queryKeys.escrow.list(),
    queryFn:  fetchMyEscrows,
    enabled:  isAuthenticated,
  })
}

export function useEscrow(id: string) {
  return useQuery({
    queryKey: queryKeys.escrow.detail(id),
    queryFn:  () => fetchEscrowDetail(id),
    enabled:  !!id,
  })
}
