import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

interface NotificationOptions {
  entityType?: string
  entityId?:   string
  data?:       Record<string, unknown>
}

export async function insertNotification(
  adminClient: AdminClient,
  userId:      string,
  type:        string,
  title:       string,
  body:        string,
  actionUrl:   string,
  opts:        NotificationOptions = {},
): Promise<void> {
  const { error } = await (adminClient as any).from('notifications').insert({
    user_id:     userId,
    type,
    title,
    body,
    action_url:  actionUrl,
    entity_type: opts.entityType ?? null,
    entity_id:   opts.entityId   ?? null,
    data:        opts.data        ?? {},
    is_read:     false,
  })
  if (error) console.error('[insertNotification]', type, error.message)
}
