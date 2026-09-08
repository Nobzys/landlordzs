'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/auth'
import type { NotificationRow } from '@/types/database'

export type Notification = NotificationRow

export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []) as Notification[]
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) return { error: error.message }
  return { success: true }
}
