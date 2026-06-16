'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/auth'

export interface NotificationRow {
  id:          string
  type:        string
  title:       string
  body:        string
  action_url:  string | null
  entity_type: string | null
  entity_id:   string | null
  is_read:     boolean
  created_at:  string
}

export async function getMyNotifications(opts?: {
  type?:   string
  cursor?: string
  limit?:  number
}): Promise<ActionResult<{ notifications: NotificationRow[]; unreadCount: number; hasMore: boolean }>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const pageSize = Math.min(opts?.limit ?? 20, 50)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('notifications')
    .select('id, type, title, body, action_url, entity_type, entity_id, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(pageSize + 1)

  if (opts?.type) query = query.eq('type', opts.type)
  if (opts?.cursor) query = query.lt('created_at', opts.cursor)

  const { data, error } = await query as { data: NotificationRow[] | null; error: unknown }
  if (error) return { error: 'Failed to load notifications.' }

  const rows = data ?? []
  const hasMore = rows.length > pageSize
  if (hasMore) rows.pop()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return { success: true, data: { notifications: rows, unreadCount: count ?? 0, hasMore } }
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { error } = await (supabase as any)
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/account/notifications')
  return { success: true }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { error } = await (supabase as any)
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) return { error: error.message }
  revalidatePath('/account/notifications')
  return { success: true }
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return count ?? 0
}
