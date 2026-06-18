'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createReviewSchema, type CreateReviewInput } from '@/lib/validations/review'
import { REVIEWABLE_ROLES } from '@/types/review'
import type { ActionResult } from '@/types/auth'

export async function createReview(input: CreateReviewInput): Promise<ActionResult<{ id: string }>> {
  const parsed = createReviewSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid review.' }
  }
  const data = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: request } = await sb
    .from('service_requests')
    .select('id, client_id, status')
    .eq('id', data.service_request_id)
    .maybeSingle()

  if (!request) return { error: 'Service request not found.' }
  if (request.client_id !== user.id) return { error: 'You can only review professionals from your own service requests.' }
  if (request.status !== 'completed') return { error: 'This request has not been completed yet.' }

  const { data: quotation } = await sb
    .from('service_quotations')
    .select('provider_id')
    .eq('request_id', data.service_request_id)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!quotation) return { error: 'No accepted professional was found for this request.' }

  const { data: providerProfile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', quotation.provider_id)
    .maybeSingle()

  if (!providerProfile || !(REVIEWABLE_ROLES as readonly string[]).includes(providerProfile.role)) {
    return { error: 'This professional cannot be reviewed.' }
  }

  const { data: row, error } = await sb
    .from('reviews')
    .insert({
      reviewer_id:   user.id,
      target_type:   providerProfile.role,
      target_id:     quotation.provider_id,
      rating:        data.rating,
      title:         data.title?.trim() || null,
      body:          data.body?.trim() || null,
      cleanliness:   data.cleanliness ?? null,
      communication: data.communication ?? null,
      value:         data.value ?? null,
      accuracy:      data.accuracy ?? null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: 'You have already reviewed this professional.' }
    }
    return { error: error.message }
  }

  revalidatePath('/account/reviews')
  return { success: true, data: { id: row.id } }
}
