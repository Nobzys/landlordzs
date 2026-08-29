'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createTenderSchema,
  submitTenderBidSchema,
  updateTenderStatusSchema,
} from '@/lib/validations/tender'

type TenderRow = {
  id:        string
  poster_id: string
  status:    string
  title:     string
}

// ─── createTender ────────────────────────────────────────────────────────────
// Inserts with status = 'draft'. Poster calls updateTenderStatus to publish.
export async function createTender(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', tenderId: null }

  const parsed = createTenderSchema.safeParse({
    title:               formData.get('title'),
    description:         formData.get('description'),
    scope_of_work:       formData.get('scope_of_work')   || undefined,
    requirements:        formData.get('requirements')     || undefined,
    category:            formData.get('category')         || undefined,
    city:                formData.get('city')             || null,
    address:             formData.get('address')          || undefined,
    budget_min:          formData.get('budget_min'),
    budget_max:          formData.get('budget_max'),
    submission_deadline: formData.get('submission_deadline'),
    start_date:          formData.get('start_date'),
    completion_date:     formData.get('completion_date'),
  })

  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? 'Invalid tender details', tenderId: null }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tender, error } = await (supabase as any)
    .from('tenders')
    .insert({
      poster_id: user.id,
      status:    'draft',
      documents: [],
      ...parsed.data,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: unknown }

  if (error || !tender) return { error: 'Failed to create tender', tenderId: null }

  revalidatePath('/tenders')
  return { success: true, tenderId: tender.id }
}

// ─── submitTenderBid ─────────────────────────────────────────────────────────
// Authenticated users bid on a published tender. bidder_id always set
// server-side. Self-bidding blocked. Duplicate caught via UNIQUE(tender_id, bidder_id).
export async function submitTenderBid(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = submitTenderBidSchema.safeParse({
    tender_id:     formData.get('tender_id'),
    amount:        formData.get('amount'),
    timeline_days: formData.get('timeline_days'),
    proposal:      formData.get('proposal'),
  })

  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? 'Invalid bid details' }
  }

  const { tender_id, amount, timeline_days, proposal } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tender } = await (supabase as any)
    .from('tenders')
    .select('id, poster_id, status, title')
    .eq('id', tender_id)
    .single() as { data: TenderRow | null }

  if (!tender)                       return { error: 'Tender not found' }
  if (tender.status !== 'published') return { error: 'This tender is no longer accepting bids' }
  if (tender.poster_id === user.id)  return { error: 'You cannot bid on your own tender' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: bidErr } = await (supabase as any)
    .from('tender_bids')
    .insert({
      tender_id,
      bidder_id:     user.id,
      amount,
      timeline_days: timeline_days ?? null,
      proposal,
      documents:     [],
      status:        'submitted',
    })

  if (bidErr) {
    if ((bidErr as { code?: string }).code === '23505')
      return { error: 'You have already submitted a bid for this tender' }
    return { error: 'Failed to submit bid' }
  }

  return { success: true }
}

// ─── updateTenderStatus ──────────────────────────────────────────────────────
// Poster transitions: draft→published, published→{closed,awarded},
// closed→awarded, awarded→cancelled.
// Sets published_at on →published, awarded_at on →awarded.
export async function updateTenderStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = updateTenderStatusSchema.safeParse({
    tender_id:  formData.get('tender_id'),
    status:     formData.get('status'),
    awarded_to: formData.get('awarded_to') || undefined,
  })

  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? 'Invalid input' }
  }

  const { tender_id, status, awarded_to } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tender } = await (supabase as any)
    .from('tenders')
    .select('id, poster_id, status')
    .eq('id', tender_id)
    .single() as { data: TenderRow | null }

  if (!tender)                      return { error: 'Tender not found' }
  if (tender.poster_id !== user.id) return { error: 'Not authorised to update this tender' }

  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    draft:     ['published'],
    published: ['closed', 'awarded'],
    closed:    ['awarded'],
    awarded:   ['cancelled'],
    cancelled: [],
  }

  if (!(ALLOWED_TRANSITIONS[tender.status] ?? []).includes(status))
    return { error: 'Invalid status transition' }

  const now = new Date().toISOString()
  const updatePayload: Record<string, unknown> = { status }

  if (status === 'published') {
    updatePayload.published_at = now
  } else if (status === 'awarded') {
    updatePayload.awarded_at = now
    if (awarded_to) updatePayload.awarded_to = awarded_to
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('tenders')
    .update(updatePayload)
    .eq('id', tender_id)
    .eq('poster_id', user.id)

  if (error) return { error: 'Failed to update tender status' }

  revalidatePath('/tenders')
  return { success: true }
}
