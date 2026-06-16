'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createServiceRequestSchema,
  rejectRequestSchema,
} from '@/lib/validations/service-request'
import type {
  CreateServiceRequestInput,
  RejectRequestInput,
} from '@/lib/validations/service-request'
import type { ActionResult } from '@/types/auth'
import {
  canRequestQuotes,
  canReceiveServiceRequests,
  canReceiveOrders,
  canAccessAdmin,
} from '@/lib/roles'
import { insertNotification } from '@/lib/notifications'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isProvider(role: string): boolean {
  return canReceiveServiceRequests(role) || canReceiveOrders(role)
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createServiceRequest(
  input: CreateServiceRequestInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createServiceRequestSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: requester } = await (supabase as any)
    .from('profiles')
    .select('role, account_status')
    .eq('id', user.id)
    .single()

  if (!requester || requester.account_status !== 'active') {
    return { error: 'Your account must be active to send service requests.' }
  }
  if (!canRequestQuotes(requester.role)) {
    return { error: 'You do not have permission to send service requests.' }
  }

  const { data: provider } = await (supabase as any)
    .from('profiles')
    .select('id, role, account_status, full_name, display_name')
    .eq('id', parsed.data.provider_id)
    .single()

  if (!provider) return { error: 'Provider not found.' }
  if (!isProvider(provider.role)) {
    return { error: 'This professional cannot receive service requests.' }
  }
  if (provider.account_status !== 'active') {
    return { error: 'This professional is not currently accepting requests.' }
  }

  const requestTypeLabel = parsed.data.request_type.replace(/_/g, ' ')

  const { data: request, error } = await (supabase as any)
    .from('service_requests')
    .insert({
      client_id:      user.id,
      provider_id:    parsed.data.provider_id,
      provider_role:  provider.role,
      request_type:   parsed.data.request_type,
      title:          parsed.data.title,
      description:    parsed.data.description,
      budget_min:     parsed.data.budget_min ?? null,
      budget_max:     parsed.data.budget_max ?? null,
      preferred_date: parsed.data.preferred_date ?? null,
      contact_phone:  parsed.data.contact_phone ?? null,
      property_id:    parsed.data.property_id ?? null,
      status:         'pending',
      currency:       'XAF',
    })
    .select('id')
    .single()

  if (error || !request) return { error: error?.message ?? 'Failed to create request.' }

  // Notify provider
  const adminClient = createAdminClient()
  await insertNotification(
    adminClient,
    parsed.data.provider_id,
    'service_update',
    'New service request',
    `You received a new ${requestTypeLabel} request.`,
    `/requests/${request.id}`,
    { entityType: 'service_request', entityId: request.id },
  )

  revalidatePath('/account/requests')
  revalidatePath('/account/leads')
  return { success: true, data: { id: request.id } }
}

// ─── Accept ───────────────────────────────────────────────────────────────────

export async function acceptServiceRequest(requestId: string): Promise<ActionResult<{ conversationId: string }>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: request } = await (supabase as any)
    .from('service_requests')
    .select('id, client_id, provider_id, status, title, request_type')
    .eq('id', requestId)
    .single()

  if (!request) return { error: 'Request not found.' }
  if (request.provider_id !== user.id) return { error: 'Insufficient permissions.' }
  if (request.status !== 'pending') return { error: `Cannot accept a request in status: ${request.status}.` }

  const { error: updateError } = await (supabase as any)
    .from('service_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)

  if (updateError) return { error: updateError.message }

  // Create messaging conversation for this request
  const { data: conversation } = await (supabase as any)
    .from('conversations')
    .insert({
      type:         'direct',
      context_type: 'service_request',
      context_id:   requestId,
      title:        request.title,
      is_archived:  false,
    })
    .select('id')
    .single()

  if (conversation) {
    await (supabase as any).from('conversation_participants').insert([
      { conversation_id: conversation.id, user_id: request.client_id,   role: 'member' },
      { conversation_id: conversation.id, user_id: user.id,             role: 'member' },
    ])
  }

  // Notify requester
  const adminClient = createAdminClient()
  const reqTypeLabel = (request.request_type as string | null)?.replace(/_/g, ' ') ?? 'your'
  await insertNotification(
    adminClient,
    request.client_id,
    'service_update',
    'Request accepted',
    `Your ${reqTypeLabel} request has been accepted.`,
    `/requests/${requestId}`,
    { entityType: 'service_request', entityId: requestId },
  )

  revalidatePath(`/requests/${requestId}`)
  revalidatePath('/account/requests')
  revalidatePath('/account/leads')
  return { success: true, data: { conversationId: conversation?.id ?? '' } }
}

// ─── Reject ───────────────────────────────────────────────────────────────────

export async function rejectServiceRequest(
  requestId: string,
  input: RejectRequestInput = {}
): Promise<ActionResult> {
  const parsed = rejectRequestSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: request } = await (supabase as any)
    .from('service_requests')
    .select('id, client_id, provider_id, status, request_type')
    .eq('id', requestId)
    .single()

  if (!request) return { error: 'Request not found.' }
  if (request.provider_id !== user.id) return { error: 'Insufficient permissions.' }
  if (request.status !== 'pending') return { error: `Cannot reject a request in status: ${request.status}.` }

  const { error: updateError } = await (supabase as any)
    .from('service_requests')
    .update({ status: 'rejected', notes: parsed.data.notes ?? null })
    .eq('id', requestId)

  if (updateError) return { error: updateError.message }

  const adminClient = createAdminClient()
  const reqTypeLabel = (request.request_type as string | null)?.replace(/_/g, ' ') ?? 'your'
  await insertNotification(
    adminClient,
    request.client_id,
    'service_update',
    'Request declined',
    `Your ${reqTypeLabel} request was not accepted.`,
    `/requests/${requestId}`,
    { entityType: 'service_request', entityId: requestId },
  )

  revalidatePath(`/requests/${requestId}`)
  revalidatePath('/account/leads')
  return { success: true }
}

// ─── Mark in progress ─────────────────────────────────────────────────────────

export async function markRequestInProgress(requestId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: request } = await (supabase as any)
    .from('service_requests')
    .select('id, client_id, provider_id, status')
    .eq('id', requestId)
    .single()

  if (!request) return { error: 'Request not found.' }
  if (request.provider_id !== user.id) return { error: 'Insufficient permissions.' }
  if (request.status !== 'accepted') return { error: `Cannot start progress from status: ${request.status}.` }

  const { error } = await (supabase as any)
    .from('service_requests')
    .update({ status: 'in_progress' })
    .eq('id', requestId)

  if (error) return { error: error.message }

  revalidatePath(`/requests/${requestId}`)
  revalidatePath('/account/leads')
  return { success: true }
}

// ─── Mark completed ───────────────────────────────────────────────────────────

export async function markRequestCompleted(requestId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: request } = await (supabase as any)
    .from('service_requests')
    .select('id, client_id, provider_id, status, request_type')
    .eq('id', requestId)
    .single()

  if (!request) return { error: 'Request not found.' }
  if (request.provider_id !== user.id) return { error: 'Insufficient permissions.' }
  if (request.status !== 'in_progress') return { error: `Cannot complete from status: ${request.status}.` }

  const { error } = await (supabase as any)
    .from('service_requests')
    .update({ status: 'completed' })
    .eq('id', requestId)

  if (error) return { error: error.message }

  const adminClient = createAdminClient()
  const reqTypeLabel = (request.request_type as string | null)?.replace(/_/g, ' ') ?? 'your'
  await insertNotification(
    adminClient,
    request.client_id,
    'service_update',
    'Service completed',
    `Your ${reqTypeLabel} request has been marked as completed. You can now leave a review.`,
    `/requests/${requestId}`,
    { entityType: 'service_request', entityId: requestId },
  )

  revalidatePath(`/requests/${requestId}`)
  revalidatePath('/account/requests')
  revalidatePath('/account/leads')
  return { success: true }
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelServiceRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: request } = await (supabase as any)
    .from('service_requests')
    .select('id, client_id, provider_id, status')
    .eq('id', requestId)
    .single()

  if (!request) return { error: 'Request not found.' }
  if (request.client_id !== user.id) return { error: 'Insufficient permissions.' }
  if (request.status !== 'pending') return { error: 'Only pending requests can be cancelled.' }

  const { error } = await (supabase as any)
    .from('service_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)

  if (error) return { error: error.message }

  revalidatePath(`/requests/${requestId}`)
  revalidatePath('/account/requests')
  return { success: true }
}

// ─── Link escrow to request ───────────────────────────────────────────────────

export async function linkEscrowToRequest(
  requestId: string,
  escrowId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: request } = await (supabase as any)
    .from('service_requests')
    .select('id, client_id, status, escrow_id')
    .eq('id', requestId)
    .single()

  if (!request) return { error: 'Request not found.' }
  if (request.client_id !== user.id) return { error: 'Insufficient permissions.' }
  if (request.status !== 'accepted') return { error: 'Escrow can only be started on accepted requests.' }
  if (request.escrow_id) return { error: 'Escrow is already linked to this request.' }

  const { error } = await (supabase as any)
    .from('service_requests')
    .update({ escrow_id: escrowId })
    .eq('id', requestId)

  if (error) return { error: error.message }

  revalidatePath(`/requests/${requestId}`)
  return { success: true }
}

// ─── Submit review (one per completed request) ────────────────────────────────

export async function submitServiceReview(
  requestId: string,
  input: { rating: number; title?: string; body?: string }
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  if (input.rating < 1 || input.rating > 5) return { error: 'Rating must be between 1 and 5.' }

  const { data: request } = await (supabase as any)
    .from('service_requests')
    .select('id, client_id, status')
    .eq('id', requestId)
    .single()

  if (!request) return { error: 'Request not found.' }
  if (request.client_id !== user.id) return { error: 'Insufficient permissions.' }
  if (request.status !== 'completed') return { error: 'Reviews are only allowed on completed requests.' }

  const { error } = await (supabase as any)
    .from('reviews')
    .insert({
      reviewer_id:  user.id,
      target_type:  'service_request',
      target_id:    requestId,
      rating:       input.rating,
      title:        input.title ?? null,
      body:         input.body ?? null,
      is_verified:  true,
    })

  if (error) {
    if (error.code === '23505') return { error: 'You have already reviewed this request.' }
    return { error: error.message }
  }

  revalidatePath(`/requests/${requestId}`)
  return { success: true }
}
