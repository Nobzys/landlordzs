'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPublicProfilePath } from '@/lib/config/roleCapabilities'
import type { ActionResult, UserRole } from '@/types/auth'

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

const REPORT_TYPES = ['spam', 'fraud', 'inappropriate', 'misleading', 'illegal', 'harassment', 'other'] as const
type ReportType = (typeof REPORT_TYPES)[number]

export async function reportProfile(
  targetId: string,
  reportType: ReportType,
  reason: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (user.id === targetId) return { error: 'You cannot report your own profile.' }
  if (!REPORT_TYPES.includes(reportType)) return { error: 'Invalid report type.' }
  if (!reason.trim()) return { error: 'Please provide a reason.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('moderation_reports')
    .insert({
      reporter_id: user.id,
      target_type: 'profile',
      target_id: targetId,
      report_type: reportType,
      reason: reason.trim(),
    })

  if (error) return { error: error.message }
  return { success: true }
}

export async function setProfileVisibility(isPublic: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: UserRole } | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ is_public: isPublic })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/account/profile')
  if (profile) {
    const path = getPublicProfilePath(profile.role, user.id)
    if (path) revalidatePath(path)
  }
  return { success: true }
}
