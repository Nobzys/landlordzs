'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/types/auth'

async function getAdminOrModerator() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { user: null, error: 'Unauthorized' as const }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: caller } = await (supabase as any).from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin' && caller?.role !== 'moderator') {
    return { user: null, error: 'Insufficient permissions' as const }
  }
  return { user, error: null }
}

export async function markReportReviewing(reportId: string): Promise<ActionResult> {
  const { error } = await getAdminOrModerator()
  if (error) return { error }

  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('moderation_reports')
    .update({ status: 'reviewing', reviewed_at: new Date().toISOString() })
    .eq('id', reportId)

  revalidatePath('/admin/reports')
  return { success: true }
}

export async function resolveReport(reportId: string, fd: FormData): Promise<ActionResult> {
  const { error } = await getAdminOrModerator()
  if (error) return { error }

  const resolution  = (fd.get('resolution')   as string | null)?.trim() || 'Content reviewed'
  const actionTaken = (fd.get('action_taken') as string | null)?.trim() || null

  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('moderation_reports')
    .update({
      status:       'resolved',
      resolution,
      action_taken: actionTaken,
      reviewed_at:  new Date().toISOString(),
    })
    .eq('id', reportId)

  revalidatePath('/admin/reports')
  return { success: true }
}

export async function dismissReport(reportId: string): Promise<ActionResult> {
  const { error } = await getAdminOrModerator()
  if (error) return { error }

  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('moderation_reports')
    .update({ status: 'dismissed', reviewed_at: new Date().toISOString() })
    .eq('id', reportId)

  revalidatePath('/admin/reports')
  return { success: true }
}
