// Internal utility — not a server action file.
// Called from escrow.ts after escrow release or milestone approval.

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * For property escrows: fetch the listing agent and their commission rate.
 * Returns null if no agent is attached or reference is not a property.
 */
export async function lookupPropertyAgent(
  referenceType: string,
  referenceId:   string
): Promise<{ agentId: string; commissionRate: number } | null> {
  if (referenceType !== 'property') return null

  const adminClient = createAdminClient()

  const { data: property } = await (adminClient as any)
    .from('properties')
    .select('agent_id')
    .eq('id', referenceId)
    .single()

  if (!property?.agent_id) return null

  const { data: agentProfile } = await (adminClient as any)
    .from('agent_profiles')
    .select('commission_rate')
    .eq('id', property.agent_id)
    .single()

  if (!agentProfile) return null

  return {
    agentId:        property.agent_id as string,
    commissionRate: agentProfile.commission_rate as number,
  }
}

/**
 * Record an agent commission and immediately credit the agent's wallet.
 *
 * Flow:
 *  1. Insert commission_record (status = 'pending') to establish the audit trail.
 *  2. Credit the agent wallet via wallet_transfer RPC.
 *  3. On success → mark commission 'paid' + set paid_at.
 *  4. On failure → leave 'pending' so admin can manually pay via the UI.
 *
 * Never throws — commission failure must not block the caller's main flow
 * (e.g., an escrow release should not fail because the agent has no wallet).
 */
export async function creditAgentCommission({
  agentId,
  saleAmount,
  commissionRate,
  referenceType,
  referenceId,
  transactionId,
}: {
  agentId:        string
  saleAmount:     number
  commissionRate: number
  referenceType:  string
  referenceId:    string
  transactionId?: string
}): Promise<void> {
  const commissionAmount = Math.round(saleAmount * (commissionRate / 100))
  if (commissionAmount <= 0) return

  const adminClient = createAdminClient()

  const { data: record, error: insertError } = await (adminClient as any)
    .from('commission_records')
    .insert({
      transaction_id:  transactionId ?? null,
      earner_id:       agentId,
      commission_type: 'agent',
      reference_type:  referenceType,
      reference_id:    referenceId,
      amount:          commissionAmount,
      rate_pct:        commissionRate,
      currency:        'XAF',
      status:          'pending',
    })
    .select('id')
    .single()

  if (insertError || !record) return

  const { error: rpcError } = await (adminClient as any).rpc('wallet_transfer', {
    p_from_id:  null,
    p_to_id:    agentId,
    p_amount:   commissionAmount,
    p_ref_type: 'commission',
    p_ref_id:   record.id,
    p_desc:     `Agent commission (${commissionRate}%) — ${referenceType}`,
  })

  if (!rpcError) {
    await (adminClient as any)
      .from('commission_records')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', record.id)
  }
  // If rpcError: commission stays 'pending', visible to admin for manual payment.
}
