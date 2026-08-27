'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import type { ActionResult } from '@/types/auth'

const PROFESSIONAL_ROLES = ['contractor', 'engineer', 'architect', 'lawyer'] as const

// ─── Portfolio ────────────────────────────────────────────────────────────────

export interface PortfolioItemInput {
  title:        string
  description?: string
  project_type?: string
  client_name?:  string
  city?:         string
  budget_xaf?:   number
  completed_at?: string  // ISO date string YYYY-MM-DD
}

async function getProfessionalUser() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { supabase, user: null, error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !(PROFESSIONAL_ROLES as readonly string[]).includes(profile.role)) {
    return { supabase, user: null, error: 'Professional account required' }
  }

  return { supabase, user, error: null }
}

export async function createPortfolioItem(
  data: PortfolioItemInput
): Promise<ActionResult<{ id: string }>> {
  if (!data.title?.trim()) return { error: 'Title is required' }

  const { supabase, user, error: authError } = await getProfessionalUser()
  if (authError || !user) return { error: authError ?? 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: item, error } = await (supabase as any)
    .from('portfolio_items')
    .insert({
      professional_id: user.id,
      title:           data.title.trim(),
      description:     data.description?.trim() || null,
      project_type:    data.project_type?.trim() || null,
      client_name:     data.client_name?.trim() || null,
      city:            data.city || null,
      budget_xaf:      data.budget_xaf ?? null,
      completed_at:    data.completed_at || null,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (error || !item) return { error: error?.message ?? 'Failed to create portfolio item' }

  revalidatePath('/contractor/portfolio')
  return { success: true, data: { id: item.id } }
}

export async function updatePortfolioItem(
  portfolioId: string,
  data: PortfolioItemInput
): Promise<ActionResult> {
  if (!data.title?.trim()) return { error: 'Title is required' }

  const { supabase, user, error: authError } = await getProfessionalUser()
  if (authError || !user) return { error: authError ?? 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('portfolio_items')
    .update({
      title:        data.title.trim(),
      description:  data.description?.trim() || null,
      project_type: data.project_type?.trim() || null,
      client_name:  data.client_name?.trim() || null,
      city:         data.city || null,
      budget_xaf:   data.budget_xaf ?? null,
      completed_at: data.completed_at || null,
    })
    .eq('id', portfolioId)
    .eq('professional_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/contractor/portfolio')
  revalidatePath(`/contractor/portfolio/${portfolioId}/edit`)
  return { success: true }
}

export async function deletePortfolioItem(portfolioId: string): Promise<ActionResult> {
  const { supabase, user, error: authError } = await getProfessionalUser()
  if (authError || !user) return { error: authError ?? 'Unauthorized' }

  // Fetch image URLs before deletion for storage cleanup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: images } = await (supabase as any)
    .from('portfolio_images')
    .select('url')
    .eq('portfolio_id', portfolioId) as { data: { url: string }[] | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('portfolio_items')
    .delete()
    .eq('id', portfolioId)
    .eq('professional_id', user.id)

  if (error) return { error: error.message }

  // Best-effort storage cleanup — orphaned files are non-fatal
  if (images?.length) {
    const marker = `/object/public/${STORAGE_BUCKETS.PORTFOLIOS}/`
    for (const img of images) {
      try {
        const path = img.url.split(marker)[1]
        if (path) await supabase.storage.from(STORAGE_BUCKETS.PORTFOLIOS).remove([path])
      } catch { /* non-fatal */ }
    }
  }

  revalidatePath('/contractor/portfolio')
  return { success: true }
}

export async function addPortfolioImage(
  portfolioId: string,
  url: string,
  isCover: boolean,
  sortOrder: number
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user, error: authError } = await getProfessionalUser()
  if (authError || !user) return { error: authError ?? 'Unauthorized' }

  // Verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: item } = await (supabase as any)
    .from('portfolio_items')
    .select('id')
    .eq('id', portfolioId)
    .eq('professional_id', user.id)
    .single() as { data: { id: string } | null }

  if (!item) return { error: 'Portfolio item not found or access denied' }

  // Enforce max 10 images
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from('portfolio_images')
    .select('id', { count: 'exact', head: true })
    .eq('portfolio_id', portfolioId) as { count: number | null }

  if ((count ?? 0) >= 10) return { error: 'Maximum 10 images per portfolio project' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: image, error } = await (supabase as any)
    .from('portfolio_images')
    .insert({ portfolio_id: portfolioId, url, is_cover: isCover, sort_order: sortOrder })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (error || !image) return { error: error?.message ?? 'Failed to add image' }

  revalidatePath(`/contractor/portfolio/${portfolioId}/edit`)
  return { success: true, data: { id: image.id } }
}

export async function removePortfolioImage(
  imageId: string,
  portfolioId: string
): Promise<ActionResult> {
  const { supabase, user, error: authError } = await getProfessionalUser()
  if (authError || !user) return { error: authError ?? 'Unauthorized' }

  // Verify ownership via JOIN
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: image } = await (supabase as any)
    .from('portfolio_images')
    .select('url, portfolio_items!inner(professional_id)')
    .eq('id', imageId)
    .eq('portfolio_id', portfolioId)
    .eq('portfolio_items.professional_id', user.id)
    .single() as { data: { url: string } | null }

  if (!image) return { error: 'Image not found or access denied' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('portfolio_images')
    .delete()
    .eq('id', imageId)
    .eq('portfolio_id', portfolioId)

  if (error) return { error: error.message }

  // Best-effort storage cleanup
  try {
    const marker = `/object/public/${STORAGE_BUCKETS.PORTFOLIOS}/`
    const path = image.url.split(marker)[1]
    if (path) await supabase.storage.from(STORAGE_BUCKETS.PORTFOLIOS).remove([path])
  } catch { /* non-fatal */ }

  revalidatePath(`/contractor/portfolio/${portfolioId}/edit`)
  return { success: true }
}

// ─── Existing actions ─────────────────────────────────────────────────────────

export async function toggleProfessionalAvailability(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await (supabase as any)
    .from('professional_profiles')
    .select('is_available')
    .eq('id', user.id)
    .single()

  if (!current) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('professional_profiles')
    .update({ is_available: !current.is_available })
    .eq('id', user.id)

  revalidatePath('/', 'layout')
}

export async function updateProfileAvatar(avatarUrl: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  revalidatePath('/', 'layout')
}
