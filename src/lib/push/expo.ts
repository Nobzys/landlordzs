import { createAdminClient } from '@/lib/supabase/admin'

type ExpoReceipt = {
  status:   'ok' | 'error'
  details?: { error?: 'DeviceNotRegistered' | 'InvalidCredentials' | 'MessageTooBig' | 'MessageRateExceeded' }
}

/**
 * Sends an Expo push notification to a user identified by their internal user_id.
 * Returns silently if the user has no token, if push is disabled in their preferences,
 * or if the Expo API is unavailable. Clears stale tokens automatically.
 *
 * NOTE: Tokens are always null until the mobile app (Phase 12) is built.
 * This function is a no-op in production until that phase ships.
 */
export async function sendExpoPush(
  userId: string,
  title:  string,
  body:   string,
  data:   Record<string, unknown> = {},
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const [{ data: profile }, { data: prefs }] = await Promise.all([
    admin.from('profiles')
      .select('expo_push_token')
      .eq('id', userId)
      .single() as Promise<{ data: { expo_push_token: string | null } | null }>,
    admin.from('notification_preferences')
      .select('push_enabled')
      .eq('user_id', userId)
      .single() as Promise<{ data: { push_enabled: boolean } | null }>,
  ])

  const token = profile?.expo_push_token
  if (!token) return

  // Default: push enabled. Only skip if a row explicitly disables it.
  if (prefs !== null && prefs.push_enabled === false) return

  let response: Response
  try {
    response = await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body:    JSON.stringify({ to: token, title, body, data }),
    })
  } catch {
    return // Network failure — don't block callers
  }

  if (!response.ok) return

  const json = (await response.json()) as { data?: ExpoReceipt }
  const receipt = json.data

  // Expo signals a permanently invalid token — remove it so we stop retrying
  if (receipt?.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
    await admin.from('profiles').update({ expo_push_token: null }).eq('id', userId)
  }
}
