'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createEscrowSchema, disputeEscrowSchema, completeMilestoneSchema } from '@/lib/validations/payment'
import type { ActionResult } from '@/types/auth'
import type { CreateEscrowInput, DisputeEscrowInput, CompleteMilestoneInput } from '@/lib/validations/payment'

const PLATFORM_FEE_PCT = 2.5

// ─── Create escrow ────────────────────────────────────────────────────────────

export async function createEscrow(
  data: CreateEscrowInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createEscrowSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  if (user.id === parsed.data.payee_id) return { error: 'Cannot create escrow with yourself' }

  const platform_fee     = Math.round(parsed.data.amount * (PLATFORM_FEE_PCT / 100))
  const release_date_ts  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: escrow, error } = await (supabase as any)
    .from('escrow_accounts')
    .insert({
      reference_type:   parsed.data.reference_type,
      reference_id:     parsed.data.reference_id,
      payer_id:         user.id,
      payee_id:         parsed.data.payee_id,
      amount:           parsed.data.amount,
      currency:         'XAF',
      platform_fee,
      platform_fee_pct: PLATFORM_FEE_PCT,
      status:           'pending',
      release_date:     release_date_ts,
    })
    .select('id')
    .single()

  if (error || !escrow) return { error: error?.message ?? 'Failed to create escrow' }

  // Log creation event
  await (supabase as any).from('escrow_events').insert({
    escrow_id:   escrow.id,
    actor_id:    user.id,
    event_type:  'created',
    description: `Escrow of ${parsed.data.amount.toLocaleString()} XAF created`,
    metadata:    { reference_type: parsed.data.reference_type, reference_id: parsed.data.reference_id },
  })

  // Create milestones if provided
  if (parsed.data.milestones && parsed.data.milestones.length > 0) {
    const totalMilestoneAmount = parsed.data.milestones.reduce((sum, m) => sum + m.amount, 0)
    if (totalMilestoneAmount !== parsed.data.amount) {
      // Auto-correct: delete escrow and return error
      await (supabase as any).from('escrow_accounts').delete().eq('id', escrow.id)
      return { error: 'Milestone amounts must sum to the total escrow amount' }
    }

    await (supabase as any).from('escrow_milestones').insert(
      parsed.data.milestones.map((m, i) => ({
        escrow_id:   escrow.id,
        title:       m.title,
        description: m.description ?? null,
        amount:      m.amount,
        percentage:  Math.round((m.amount / parsed.data.amount) * 100),
        status:      'pending',
        due_date:    m.due_date ?? null,
      }))
    )
  }

  revalidatePath('/account/escrow')
  return { success: true, data: { id: escrow.id } }
}

// ─── Fund escrow (called after payment webhook confirms) ─────────────────────

export async function fundEscrow(escrowId: string, transactionId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: escrow } = await (supabase as any)
    .from('escrow_accounts')
    .select('id, payer_id, status')
    .eq('id', escrowId)
    .single()

  if (!escrow) return { error: 'Escrow not found' }
  if (escrow.payer_id !== user.id) return { error: 'Unauthorized' }
  if (escrow.status !== 'pending') return { error: `Escrow is already ${escrow.status}` }

  const { error } = await (supabase as any)
    .from('escrow_accounts')
    .update({ status: 'funded', funded_at: new Date().toISOString() })
    .eq('id', escrowId)

  if (error) return { error: error.message }

  await (supabase as any).from('escrow_events').insert({
    escrow_id:   escrowId,
    actor_id:    user.id,
    event_type:  'funded',
    description: 'Escrow funded by payer',
    metadata:    { transaction_id: transactionId },
  })

  revalidatePath(`/account/escrow/${escrowId}`)
  return { success: true }
}

// ─── Release escrow (payer approves) ─────────────────────────────────────────

export async function releaseEscrow(escrowId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: escrow } = await (supabase as any)
    .from('escrow_accounts')
    .select('id, payer_id, status')
    .eq('id', escrowId)
    .single()

  if (!escrow) return { error: 'Escrow not found' }
  if (escrow.payer_id !== user.id) return { error: 'Only the payer can release escrow' }
  if (escrow.status !== 'funded') return { error: `Cannot release escrow in status: ${escrow.status}` }

  const { error: rpcError } = await (supabase as any).rpc('release_escrow', { p_escrow_id: escrowId })
  if (rpcError) return { error: rpcError.message }

  await (supabase as any).from('escrow_events').insert({
    escrow_id:   escrowId,
    actor_id:    user.id,
    event_type:  'released',
    description: 'Escrow released by payer',
    metadata:    {},
  })

  revalidatePath(`/account/escrow/${escrowId}`)
  revalidatePath('/account/escrow')
  return { success: true }
}

// ─── Dispute escrow ───────────────────────────────────────────────────────────

export async function disputeEscrow(
  escrowId: string,
  data: DisputeEscrowInput
): Promise<ActionResult> {
  const parsed = disputeEscrowSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: escrow } = await (supabase as any)
    .from('escrow_accounts')
    .select('id, payer_id, payee_id, status')
    .eq('id', escrowId)
    .single()

  if (!escrow) return { error: 'Escrow not found' }
  if (![escrow.payer_id, escrow.payee_id].includes(user.id)) return { error: 'Unauthorized' }
  if (escrow.status !== 'funded') return { error: 'Can only dispute a funded escrow' }

  const { error } = await (supabase as any)
    .from('escrow_accounts')
    .update({ status: 'disputed', disputed_at: new Date().toISOString(), dispute_reason: parsed.data.reason })
    .eq('id', escrowId)

  if (error) return { error: error.message }

  await (supabase as any).from('escrow_events').insert({
    escrow_id:   escrowId,
    actor_id:    user.id,
    event_type:  'disputed',
    description: parsed.data.reason,
    metadata:    {},
  })

  revalidatePath(`/account/escrow/${escrowId}`)
  return { success: true }
}

// ─── Milestone: mark complete (payee) ────────────────────────────────────────

export async function completeMilestone(data: CompleteMilestoneInput): Promise<ActionResult> {
  const parsed = completeMilestoneSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: milestone } = await (supabase as any)
    .from('escrow_milestones')
    .select('id, escrow_id, status, escrow_accounts(payee_id)')
    .eq('id', parsed.data.milestone_id)
    .single()

  if (!milestone) return { error: 'Milestone not found' }
  if ((milestone.escrow_accounts as any)?.payee_id !== user.id) return { error: 'Only the payee can complete milestones' }
  if (milestone.status !== 'pending' && milestone.status !== 'in_progress') {
    return { error: `Milestone is already ${milestone.status}` }
  }

  const { error } = await (supabase as any)
    .from('escrow_milestones')
    .update({
      status:        'completed',
      completed_at:  new Date().toISOString(),
      evidence_urls: parsed.data.evidence_urls ?? [],
      notes:         parsed.data.notes ?? null,
    })
    .eq('id', parsed.data.milestone_id)

  if (error) return { error: error.message }

  await (supabase as any).from('escrow_events').insert({
    escrow_id:   milestone.escrow_id,
    actor_id:    user.id,
    event_type:  'milestone_completed',
    description: `Milestone completed: ${parsed.data.milestone_id}`,
    metadata:    { milestone_id: parsed.data.milestone_id },
  })

  revalidatePath(`/account/escrow/${milestone.escrow_id}`)
  return { success: true }
}

// ─── Milestone: approve (payer) ───────────────────────────────────────────────

export async function approveMilestone(milestoneId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: milestone } = await (supabase as any)
    .from('escrow_milestones')
    .select('id, escrow_id, amount, status, escrow_accounts(payer_id, payee_id)')
    .eq('id', milestoneId)
    .single()

  if (!milestone) return { error: 'Milestone not found' }
  if ((milestone.escrow_accounts as any)?.payer_id !== user.id) return { error: 'Only the payer can approve milestones' }
  if (milestone.status !== 'completed') return { error: 'Milestone must be completed first' }

  const { error } = await (supabase as any)
    .from('escrow_milestones')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', milestoneId)

  if (error) return { error: error.message }

  // Partial release: credit payee wallet for this milestone amount
  const payeeId = (milestone.escrow_accounts as any)?.payee_id
  await (supabase as any).rpc('wallet_transfer', {
    p_from_id:  null,
    p_to_id:    payeeId,
    p_amount:   milestone.amount,
    p_ref_type: 'escrow_milestone',
    p_ref_id:   milestoneId,
    p_desc:     'Milestone payment released',
  })

  await (supabase as any).from('escrow_events').insert({
    escrow_id:   milestone.escrow_id,
    actor_id:    user.id,
    event_type:  'milestone_approved',
    description: `Milestone approved, ${milestone.amount.toLocaleString()} XAF released`,
    metadata:    { milestone_id: milestoneId, amount: milestone.amount },
  })

  revalidatePath(`/account/escrow/${milestone.escrow_id}`)
  return { success: true }
}

// ─── Admin: resolve dispute ───────────────────────────────────────────────────

export async function resolveDisputeAdmin(
  escrowId: string,
  resolution: 'release_to_payee' | 'refund_to_payer',
  notes: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return { error: 'Insufficient permissions' }

  const adminClient = createAdminClient()
  const { data: escrow } = await (adminClient as any)
    .from('escrow_accounts')
    .select('*')
    .eq('id', escrowId)
    .eq('status', 'disputed')
    .single()

  if (!escrow) return { error: 'Escrow not found or not disputed' }

  const recipientId = resolution === 'release_to_payee' ? escrow.payee_id : escrow.payer_id
  const netAmount   = resolution === 'release_to_payee'
    ? escrow.amount - escrow.platform_fee
    : escrow.amount

  // Credit the winner
  await (adminClient as any).rpc('wallet_transfer', {
    p_from_id:  null,
    p_to_id:    recipientId,
    p_amount:   netAmount,
    p_ref_type: 'escrow_dispute_resolution',
    p_ref_id:   escrowId,
    p_desc:     `Dispute resolved: ${resolution}`,
  })

  await (adminClient as any).from('escrow_accounts').update({
    status:           'released',
    resolved_at:      new Date().toISOString(),
    resolution_notes: notes,
    released_at:      new Date().toISOString(),
  }).eq('id', escrowId)

  await (adminClient as any).from('escrow_events').insert({
    escrow_id:   escrowId,
    actor_id:    user.id,
    event_type:  'dispute_resolved',
    description: notes,
    metadata:    { resolution, recipient_id: recipientId, net_amount: netAmount },
  })

  revalidatePath(`/account/escrow/${escrowId}`)
  return { success: true }
}
