'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/types/auth'

const VALID_TYPES = ['info', 'warning', 'maintenance', 'feature'] as const
type AnnouncementType = typeof VALID_TYPES[number]

export async function createAnnouncement(fd: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: callerProfile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (callerProfile?.role !== 'admin') return { error: 'Insufficient permissions.' }

  const title    = (fd.get('title')     as string | null)?.trim() || null
  const body     = (fd.get('body')      as string | null)?.trim() || null
  const type     = (fd.get('type')      as string | null)?.trim() || 'info'
  const audience = (fd.get('audience')  as string | null)?.trim() || 'all'
  const startsAt = (fd.get('starts_at') as string | null)?.trim() || null
  const endsAt   = (fd.get('ends_at')   as string | null)?.trim() || null

  if (!title || !body) return { error: 'Title and content are required.' }
  if (!VALID_TYPES.includes(type as AnnouncementType)) return { error: 'Invalid announcement type.' }

  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('announcements')
    .insert({
      author_id: user.id,
      title,
      body,
      type,
      audience,
      is_active: true,
      starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
      ends_at:   endsAt   ? new Date(endsAt).toISOString()   : null,
    })

  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
  return { success: true }
}

export async function toggleAnnouncement(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: callerProfile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (callerProfile?.role !== 'admin') return { error: 'Insufficient permissions.' }

  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('announcements')
    .update({ is_active: !isActive })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
  return { success: true }
}
