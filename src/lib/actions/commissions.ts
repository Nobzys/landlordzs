'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/types/auth'

// â”€â”€â”€ Pay commission (credit agent wallet) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function payCommission(commissionId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: caller } = await (supabase as any).from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  if (caller?.role !== 'admin') return { error: 'Insufficient permissions' }

  const adminClient = createAdminClient()
  const { data: commission } = await (adminClient as any)
    .from('commission_records')
    .select('*')
    .eq('id', commissionId)
    .eq('status', 'pending')
    .single()

  if (!commission) return { error: 'Commission not found or already paid' }

  // Credit agent wallet
  const { error: rpcError } = await (adminClient as any).rpc('wallet_transfer', {
    p_from_id:  null,
    p_to_id:    commission.earner_id,
    p_amount:   commission.amount,
    p_ref_type: 'commission',
    p_ref_id:   commissionId,
    p_desc:     `Commission payment - ${commission.commission_type}`,
  })

  if (rpcError) return { error: rpcError.message }

  await (adminClient as any)
    .from('commission_records')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', commissionId)

  revalidatePath('/agent/commissions')
  revalidatePath('/admin/commissions')
  return { success: true }
}

// â”€â”€â”€ Cancel commission â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function cancelCommission(commissionId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: caller } = await (supabase as any).from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  if (caller?.role !== 'admin') return { error: 'Insufficient permissions' }

  const adminClient = createAdminClient()
  const { error } = await (adminClient as any)
    .from('commission_records')
    .update({ status: 'cancelled' })
    .eq('id', commissionId)
    .eq('status', 'pending')

  if (error) return { error: error.message }
  revalidatePath('/admin/commissions')
  return { success: true }
}

// â”€â”€â”€ Get commission summary for an agent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getCommissionSummary(agentId: string): Promise<
  ActionResult<{ pending: number; paid: number; pending_amount: number; paid_amount: number }>
> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  if (user.id !== agentId) {
    const { data: caller } = await (supabase as any).from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
    if (caller?.role !== 'admin') return { error: 'Insufficient permissions' }
  }

  const { data, error } = await (supabase as any)
    .from('commission_records')
    .select('amount, status')
    .eq('earner_id', agentId)

  if (error) return { error: error.message }

  const rows   = (data ?? []) as Array<{ amount: number; status: string }>
  const pending = rows.filter(r => r.status === 'pending')
  const paid    = rows.filter(r => r.status === 'paid')

  return {
    success: true,
    data: {
      pending:        pending.length,
      paid:           paid.length,
      pending_amount: pending.reduce((s, r) => s + r.amount, 0),
      paid_amount:    paid.reduce((s, r) => s + r.amount, 0),
    },
  }
}
