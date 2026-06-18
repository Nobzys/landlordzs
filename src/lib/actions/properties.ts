'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { propertyCreateSchema, inquirySchema } from '@/lib/validations/property'
import { slugify } from '@/lib/utils/format'
import { STORAGE_BUCKETS, PROPERTY_CREATOR_ROLES } from '@/lib/utils/constants'
import type { ActionResult } from '@/types/auth'
import type { PropertyCreateInput, InquiryInput } from '@/lib/validations/property'

// â”€â”€â”€ Create â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createProperty(
  data: PropertyCreateInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = propertyCreateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: actor } = await (supabase as any)
    .from('profiles').select('account_status, role').eq('id', user.id).single()

  if (!actor || !(PROPERTY_CREATOR_ROLES as readonly string[]).includes(actor.role)) {
    return { error: 'Your account type is not permitted to create property listings.' }
  }
  if (actor.account_status !== 'active') {
    return { error: 'Your account must be approved before creating listings.' }
  }

  const { amenities, has_security, has_generator, has_borehole, is_negotiable, land_area_sqm, ...fields } = parsed.data
  const slug = `${slugify(fields.title)}-${Date.now()}`

  const { data: property, error } = await (supabase as any)
    .from('properties')
    .insert({
      ...fields,
      slug,
      owner_id: user.id,
      status: 'draft',
      has_security,
      has_generator,
      has_borehole,
      price_negotiable: is_negotiable,
      plot_area_sqm: land_area_sqm,
    })
    .select('id, slug')
    .single()

  if (error || !property) return { error: error?.message ?? 'Failed to create property' }

  if (amenities.length > 0) {
    await (supabase as any).from('property_amenities').insert(
      amenities.map(a => ({ ...a, property_id: property.id }))
    )
  }

  revalidatePath('/seller/listings')
  return { success: true, data: { id: property.id, slug: property.slug } }
}

// â”€â”€â”€ Update â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function updateProperty(
  propertyId: string,
  data: Partial<PropertyCreateInput>
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: actor } = await (supabase as any)
    .from('profiles').select('account_status').eq('id', user.id).single()
  if (actor?.account_status !== 'active') {
    return { error: 'Your account must be approved before editing listings.' }
  }

  const { amenities, is_negotiable, land_area_sqm, ...fields } = data

  const { error } = await (supabase as any)
    .from('properties')
    .update({
      ...fields,
      ...(is_negotiable !== undefined && { price_negotiable: is_negotiable }),
      ...(land_area_sqm !== undefined && { plot_area_sqm: land_area_sqm }),
    })
    .eq('id', propertyId)
    .eq('owner_id', user.id)

  if (error) return { error: error.message }

  if (amenities !== undefined) {
    await (supabase as any).from('property_amenities').delete().eq('property_id', propertyId)
    if (amenities.length > 0) {
      await (supabase as any).from('property_amenities').insert(
        amenities.map(a => ({ ...a, property_id: propertyId }))
      )
    }
  }

  revalidatePath(`/properties/${propertyId}`)
  revalidatePath('/seller/listings')
  return { success: true }
}

// â”€â”€â”€ Delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function deleteProperty(propertyId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { error } = await (supabase as any)
    .from('properties')
    .delete()
    .eq('id', propertyId)
    .eq('owner_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/seller/listings')
  return { success: true }
}

// â”€â”€â”€ Publish / Unpublish â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function publishProperty(
  propertyId: string,
  publish: boolean
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  if (publish) {
    const { data: actor } = await (supabase as any)
      .from('profiles').select('account_status').eq('id', user.id).single()
    if (actor?.account_status !== 'active') {
      return { error: 'Your account must be approved before publishing listings.' }
    }
  }

  const { error } = await (supabase as any)
    .from('properties')
    .update({
      status:       publish ? 'active' : 'off_market',
      published_at: publish ? new Date().toISOString() : null,
    })
    .eq('id', propertyId)
    .eq('owner_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/properties/${propertyId}`)
  revalidatePath('/seller/listings')
  return { success: true }
}

// â”€â”€â”€ Images â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function addPropertyImage(
  propertyId: string,
  url: string,
  path: string,
  isPrimary: boolean = false
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: existing } = await (supabase as any)
    .from('property_images')
    .select('id')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? 1 : 0

  if (isPrimary) {
    await (supabase as any)
      .from('property_images')
      .update({ is_primary: false })
      .eq('property_id', propertyId)
  }

  const { data, error } = await (supabase as any)
    .from('property_images')
    .insert({
      property_id: propertyId,
      url,
      is_primary: isPrimary || nextOrder === 0,
      sort_order: nextOrder,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to save image' }
  return { success: true, data: { id: data.id } }
}

export async function removePropertyImage(
  imageId: string,
  storagePath: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  await supabase.storage.from(STORAGE_BUCKETS.PROPERTY_IMAGES).remove([storagePath])

  const { error } = await (supabase as any)
    .from('property_images')
    .delete()
    .eq('id', imageId)

  if (error) return { error: error.message }
  return { success: true }
}

// â”€â”€â”€ Videos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function addPropertyVideo(
  propertyId: string,
  url: string,
  title?: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data, error } = await (supabase as any)
    .from('property_videos')
    .insert({ property_id: propertyId, url, title: title ?? null })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to save video' }
  return { success: true, data: { id: data.id } }
}

// â”€â”€â”€ Favorites â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function toggleFavorite(propertyId: string): Promise<ActionResult<{ favorited: boolean }>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Sign in to save properties' }

  const { data: existing } = await (supabase as any)
    .from('property_favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .maybeSingle()

  if (existing) {
    await (supabase as any).from('property_favorites').delete().eq('id', existing.id)
    return { success: true, data: { favorited: false } }
  }

  await (supabase as any).from('property_favorites').insert({ user_id: user.id, property_id: propertyId })
  return { success: true, data: { favorited: true } }
}

// â”€â”€â”€ Inquiry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function submitInquiry(
  propertyId: string,
  data: InquiryInput
): Promise<ActionResult> {
  const parsed = inquirySchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await (supabase as any).from('property_inquiries').insert({
    property_id: propertyId,
    sender_id:   user?.id ?? null,
    ...parsed.data,
  })

  if (error) return { error: error.message }
  return { success: true }
}

// â”€â”€â”€ Verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function requestVerification(propertyId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: existing } = await (supabase as any)
    .from('property_verifications')
    .select('id, status')
    .eq('property_id', propertyId)
    .maybeSingle()

  if (existing?.status === 'pending') return { error: 'Verification already pending' }
  if (existing?.status === 'approved') return { error: 'Property is already verified' }

  const { error } = await (supabase as any).from('property_verifications').insert({
    property_id: propertyId,
    status:      'pending',
  })

  if (error) return { error: error.message }

  await (supabase as any)
    .from('properties')
    .update({ status: 'pending_review' })
    .eq('id', propertyId)
    .eq('owner_id', user.id)

  revalidatePath(`/properties/${propertyId}`)
  return { success: true }
}

// â”€â”€â”€ Admin: approve/reject verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function reviewVerification(
  verificationId: string,
  action: 'approved' | 'rejected',
  notes?: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: callerProfile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'admin') return { error: 'Insufficient permissions' }

  const adminClient = createAdminClient()

  const { data: verification, error: fetchError } = await (adminClient as any)
    .from('property_verifications')
    .update({ status: action, verified_by: user.id, notes: notes ?? null, verified_at: new Date().toISOString() })
    .eq('id', verificationId)
    .select('property_id')
    .single()

  if (fetchError || !verification) return { error: fetchError?.message ?? 'Not found' }

  if (action === 'approved') {
    await (adminClient as any)
      .from('properties')
      .update({ is_verified: true, status: 'active' })
      .eq('id', verification.property_id)
  } else {
    await (adminClient as any)
      .from('properties')
      .update({ status: 'rejected' })
      .eq('id', verification.property_id)
  }

  revalidatePath(`/properties/${verification.property_id}`)
  return { success: true }
}

// ─── Admin: assign agent to a property ─────────────────────────────────────

export async function adminAssignAgent(
  propertyId: string,
  agentId: string | null
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: callerProfile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'admin') return { error: 'Insufficient permissions' }

  const adminClient = createAdminClient()

  const { error: updateError } = await (adminClient as any)
    .from('properties')
    .update({ agent_id: agentId })
    .eq('id', propertyId)

  if (updateError) return { error: updateError.message }

  await (adminClient as any).from('admin_logs').insert({
    actor_id:    user.id,
    action:      agentId ? 'assign_agent' : 'remove_agent',
    target_type: 'property',
    target_id:   propertyId,
    new_data:    agentId ? { agent_id: agentId } : null,
  })

  revalidatePath(`/admin/properties/${propertyId}`)
  revalidatePath(`/properties/${propertyId}`)
  return { success: true }
}
