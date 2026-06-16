'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/types/auth'

export async function toggleSaveProfessional(
  professionalId: string,
): Promise<ActionResult<{ saved: boolean }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const adminClient = createAdminClient()

  // Check if already saved
  const { data: existing } = await (adminClient as any)
    .from('saved_professionals')
    .select('id')
    .eq('user_id', user.id)
    .eq('professional_id', professionalId)
    .maybeSingle() as { data: { id: string } | null }

  if (existing) {
    await (adminClient as any)
      .from('saved_professionals')
      .delete()
      .eq('user_id', user.id)
      .eq('professional_id', professionalId)
    return { success: true, data: { saved: false } }
  }

  const { error } = await (adminClient as any)
    .from('saved_professionals')
    .insert({ user_id: user.id, professional_id: professionalId })

  if (error) return { error: error.message }
  return { success: true, data: { saved: true } }
}

export async function getSavedProfessionalIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await (supabase as any)
    .from('saved_professionals')
    .select('professional_id')
    .eq('user_id', user.id) as { data: { professional_id: string }[] | null }

  return (data ?? []).map((r) => r.professional_id)
}

export async function getSavedProfessionals(): Promise<ActionResult<Record<string, unknown>[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await (supabase as any)
    .from('saved_professionals')
    .select(
      `created_at, profiles:professional_id (
        id, full_name, display_name, avatar_url, city, role,
        is_premium, is_verified, company_name, years_experience, specialties, slug
      )`
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false }) as {
      data: { created_at: string; profiles: Record<string, unknown> }[] | null
      error: any
    }

  if (error) return { error: error.message }

  return {
    data: (data ?? [])
      .filter((r) => r.profiles)
      .map((r) => ({ ...r.profiles, saved_at: r.created_at })),
  }
}
