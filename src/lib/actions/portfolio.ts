'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCapabilities } from '@/lib/config/roleCapabilities'
import type { ActionResult, UserRole } from '@/types/auth'

interface PortfolioItemInput {
  title: string
  description?: string | null
  projectType?: string | null
  city?: string | null
  completedAt?: string | null
}

async function requirePortfolioCapability(): Promise<
  { user: { id: string }; error: null } | { user: null; error: ActionResult }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, error: { error: 'Not authenticated.' } }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: UserRole } | null }

  if (!profile || !getCapabilities(profile.role).hasPortfolio) {
    return { user: null, error: { error: 'Your role does not support a portfolio.' } }
  }

  return { user, error: null }
}

export async function createPortfolioItem(input: PortfolioItemInput): Promise<ActionResult<{ id: string }>> {
  const access = await requirePortfolioCapability()
  if (!access.user) return access.error

  if (!input.title.trim()) return { error: 'A title is required.' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('portfolio_items')
    .insert({
      professional_id: access.user.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      project_type: input.projectType?.trim() || null,
      city: input.city || null,
      completed_at: input.completedAt || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/account/portfolio')
  return { success: true, data: { id: data.id } }
}

export async function updatePortfolioItem(id: string, input: PortfolioItemInput): Promise<ActionResult> {
  const access = await requirePortfolioCapability()
  if (!access.user) return access.error

  if (!input.title.trim()) return { error: 'A title is required.' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('portfolio_items')
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      project_type: input.projectType?.trim() || null,
      city: input.city || null,
      completed_at: input.completedAt || null,
    })
    .eq('id', id)
    .eq('professional_id', access.user.id)

  if (error) return { error: error.message }

  revalidatePath('/account/portfolio')
  revalidatePath(`/account/portfolio/${id}`)
  return { success: true }
}

export async function deletePortfolioItem(id: string): Promise<ActionResult> {
  const access = await requirePortfolioCapability()
  if (!access.user) return access.error

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('portfolio_items')
    .delete()
    .eq('id', id)
    .eq('professional_id', access.user.id)

  if (error) return { error: error.message }

  revalidatePath('/account/portfolio')
  return { success: true }
}

export async function addPortfolioImage(portfolioId: string, url: string, caption?: string | null): Promise<ActionResult<{ id: string }>> {
  const access = await requirePortfolioCapability()
  if (!access.user) return access.error

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: item } = await sb
    .from('portfolio_items')
    .select('id')
    .eq('id', portfolioId)
    .eq('professional_id', access.user.id)
    .maybeSingle()

  if (!item) return { error: 'Portfolio item not found.' }

  const { data, error } = await sb
    .from('portfolio_images')
    .insert({ portfolio_id: portfolioId, url, caption: caption?.trim() || null })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/account/portfolio/${portfolioId}`)
  return { success: true, data: { id: data.id } }
}

export async function deletePortfolioImage(imageId: string, portfolioId: string): Promise<ActionResult> {
  const access = await requirePortfolioCapability()
  if (!access.user) return access.error

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('portfolio_images')
    .delete()
    .eq('id', imageId)
    .eq('portfolio_id', portfolioId)

  if (error) return { error: error.message }

  revalidatePath(`/account/portfolio/${portfolioId}`)
  return { success: true }
}

export async function setCoverImage(imageId: string, portfolioId: string): Promise<ActionResult> {
  const access = await requirePortfolioCapability()
  if (!access.user) return access.error

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  await sb.from('portfolio_images').update({ is_cover: false }).eq('portfolio_id', portfolioId)
  const { error } = await sb.from('portfolio_images').update({ is_cover: true }).eq('id', imageId)

  if (error) return { error: error.message }

  revalidatePath(`/account/portfolio/${portfolioId}`)
  return { success: true }
}
