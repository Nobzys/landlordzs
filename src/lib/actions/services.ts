'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRequestSchema, submitQuotationSchema } from '@/lib/validations/service'
import type { ActionResult } from '@/types/auth'

const PROFESSIONAL_ROLES = ['contractor', 'engineer', 'architect', 'lawyer'] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { supabase, user: null }
  return { supabase, user }
}

async function getProfessionalSession() {
  const { supabase, user } = await getAuthUser()
  if (!user) return { supabase, user: null, error: 'Unauthorized' as const }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !(PROFESSIONAL_ROLES as readonly string[]).includes(profile.role)) {
    return { supabase, user: null, error: 'Professional account required' as const }
  }

  return { supabase, user, error: null }
}

// ─── createServiceRequest ─────────────────────────────────────────────────────
// Any authenticated user may post a service request.
// client_id is always derived server-side from auth — never from form data.

export async function createServiceRequest(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await getAuthUser()
  if (!user) return { error: 'Unauthorized' }

  const raw = {
    title:       formData.get('title'),
    description: formData.get('description'),
    category_id: formData.get('category_id') || undefined,
    city:        formData.get('city') || undefined,
    address:     formData.get('address') || undefined,
    budget_min:  formData.get('budget_min') || undefined,
    budget_max:  formData.get('budget_max') || undefined,
    deadline:    formData.get('deadline') || undefined,
  }

  const parsed = createServiceRequestSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { title, description, category_id, city, address, budget_min, budget_max, deadline } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: item, error } = await (supabase as any)
    .from('service_requests')
    .insert({
      client_id:   user.id,
      title:       title.trim(),
      description: description.trim(),
      category_id: category_id || null,
      city:        city || null,
      address:     address || null,
      budget_min:  budget_min ?? null,
      budget_max:  budget_max ?? null,
      deadline:    deadline || null,
      status:      'open',
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (error || !item) return { error: error?.message ?? 'Failed to create service request' }

  revalidatePath('/services')
  return { success: true, data: { id: item.id } }
}

// ─── submitQuotation ──────────────────────────────────────────────────────────
// Only professionals may submit a quotation.
// provider_id is always derived server-side from auth — never from form data.

export async function submitQuotation(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error: authError } = await getProfessionalSession()
  if (authError || !user) return { error: authError ?? 'Unauthorized' }

  const raw = {
    request_id:   formData.get('request_id'),
    amount:       formData.get('amount'),
    timeline_days: formData.get('timeline_days') || undefined,
    proposal:     formData.get('proposal'),
  }

  const parsed = submitQuotationSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { request_id, amount, timeline_days, proposal } = parsed.data

  // Verify the request exists, is open, and the caller is not the client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: request } = await (supabase as any)
    .from('service_requests')
    .select('id, status, client_id')
    .eq('id', request_id)
    .eq('status', 'open')
    .single() as { data: { id: string; status: string; client_id: string } | null }

  if (!request) return { error: 'Service request not found or no longer accepting quotes' }
  if (request.client_id === user.id) return { error: 'You cannot quote on your own service request' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('service_quotations')
    .insert({
      request_id,
      provider_id:   user.id,
      amount,
      timeline_days: timeline_days ?? null,
      proposal:      proposal.trim(),
      status:        'pending',
    })

  if (error) {
    if (error.code === '23505') return { error: 'You have already submitted a quotation for this request.' }
    return { error: error.message }
  }

  revalidatePath(`/services/${request_id}`)
  revalidatePath('/contractor/requests')
  return { success: true }
}

// ─── acceptQuotation ──────────────────────────────────────────────────────────
// Only the client (service_requests.client_id) may accept a quotation.
// Ownership is enforced via JOIN — a provider calling this receives zero rows.
// Multi-step: quotation accepted → request status updated → others rejected → contract created.

export async function acceptQuotation(quotationId: string): Promise<ActionResult<{ contractId: string }>> {
  const { supabase, user } = await getAuthUser()
  if (!user) return { error: 'Unauthorized' }

  // Fetch quotation WITH its request, enforcing client ownership via JOIN filter.
  // A provider's user.id will never match service_requests.client_id here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: quotation } = await (supabase as any)
    .from('service_quotations')
    .select(`
      id, status, provider_id, amount, currency, timeline_days,
      service_requests!inner(id, client_id, status, title, description)
    `)
    .eq('id', quotationId)
    .eq('service_requests.client_id', user.id)
    .single() as {
      data: {
        id: string
        status: string
        provider_id: string
        amount: number
        currency: string
        timeline_days: number | null
        service_requests: {
          id: string
          client_id: string
          status: string
          title: string
          description: string
        }
      } | null
    }

  if (!quotation) return { error: 'Not found or not authorized' }

  const request = quotation.service_requests
  if (quotation.status !== 'pending') return { error: 'This quotation has already been processed' }
  if (request.status !== 'open') return { error: 'This service request is no longer open' }

  // Step 1: Accept this quotation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: quotErr } = await (supabase as any)
    .from('service_quotations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', quotationId)

  if (quotErr) return { error: quotErr.message }

  // Step 2: Advance service request to 'accepted' (client owns this row — RLS allows it)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: reqErr } = await (supabase as any)
    .from('service_requests')
    .update({ status: 'accepted' })
    .eq('id', request.id)
    .eq('client_id', user.id)

  if (reqErr) return { error: reqErr.message }

  // Step 3: Reject all other pending quotations for this request
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('service_quotations')
    .update({ status: 'rejected', rejected_at: new Date().toISOString() })
    .eq('request_id', request.id)
    .eq('status', 'pending')
    .neq('id', quotationId)

  // Step 4: Create service contract
  const endDate = quotation.timeline_days
    ? new Date(Date.now() + quotation.timeline_days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contract, error: contErr } = await (supabase as any)
    .from('service_contracts')
    .insert({
      request_id:       request.id,
      quotation_id:     quotationId,
      client_id:        user.id,
      provider_id:      quotation.provider_id,
      title:            request.title,
      scope:            request.description,
      total_amount:     quotation.amount,
      currency:         quotation.currency,
      start_date:       new Date().toISOString().split('T')[0],
      end_date:         endDate,
      status:           'active',
      client_signed:    true,
      client_signed_at: new Date().toISOString(),
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (contErr || !contract) return { error: contErr?.message ?? 'Failed to create service contract' }

  revalidatePath(`/services/${request.id}`)
  revalidatePath('/contractor/requests')
  return { success: true, data: { contractId: contract.id } }
}

// ─── completeService ──────────────────────────────────────────────────────────
// Only the client may mark a service as complete.
// Sets service_request.status = 'completed', which unlocks the review gate in reviews.ts.

export async function completeService(contractId: string): Promise<ActionResult> {
  const { supabase, user } = await getAuthUser()
  if (!user) return { error: 'Unauthorized' }

  // Fetch contract verifying caller is the client (ownership via .eq)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contract } = await (supabase as any)
    .from('service_contracts')
    .select('id, status, request_id, client_id')
    .eq('id', contractId)
    .eq('client_id', user.id)
    .single() as { data: { id: string; status: string; request_id: string; client_id: string } | null }

  if (!contract) return { error: 'Not found or not authorized' }
  if (contract.status !== 'active') return { error: 'Contract is not active' }

  // Update contract status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: contErr } = await (supabase as any)
    .from('service_contracts')
    .update({ status: 'completed' })
    .eq('id', contractId)
    .eq('client_id', user.id)

  if (contErr) return { error: contErr.message }

  // Update service request status — feeds the review gate in reviews.ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('service_requests')
    .update({ status: 'completed' })
    .eq('id', contract.request_id)
    .eq('client_id', user.id)

  revalidatePath(`/services/${contract.request_id}`)
  revalidatePath('/contractor/requests')
  return { success: true }
}

// ─── cancelService ────────────────────────────────────────────────────────────
// Either party (client or provider) may cancel an active contract.
// A completed contract cannot be cancelled.
// Uses status update — never DELETE (svccont_parties FOR ALL would allow raw deletes).
// Only the client can update service_requests.status (svcreq_update RLS constraint).

export async function cancelService(contractId: string): Promise<ActionResult> {
  const { supabase, user } = await getAuthUser()
  if (!user) return { error: 'Unauthorized' }

  // Confirm caller is a party by fetching with an OR filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contract } = await (supabase as any)
    .from('service_contracts')
    .select('id, status, request_id, client_id, provider_id')
    .eq('id', contractId)
    .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
    .single() as {
      data: { id: string; status: string; request_id: string; client_id: string; provider_id: string } | null
    }

  if (!contract) return { error: 'Not found or not authorized' }
  if (contract.status === 'completed') return { error: 'A completed contract cannot be cancelled' }
  if (contract.status === 'cancelled') return { error: 'Contract is already cancelled' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: contErr } = await (supabase as any)
    .from('service_contracts')
    .update({ status: 'cancelled' })
    .eq('id', contractId)

  if (contErr) return { error: contErr.message }

  // Only the client can update service_requests (svcreq_update RLS)
  if (contract.client_id === user.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('service_requests')
      .update({ status: 'cancelled' })
      .eq('id', contract.request_id)
      .eq('client_id', user.id)
  }

  revalidatePath(`/services/${contract.request_id}`)
  revalidatePath('/contractor/requests')
  return { success: true }
}
