import { createAdminClient } from '@/lib/supabase/admin'

export interface RateLimitResult {
  limited: boolean
  error?: string
}

/**
 * Check and record a rate-limited action attempt.
 *
 * Backed by the password_reset_attempts table (already exists, service-role
 * only). Keys are namespaced as `rl:<action>:<identifier>` in the `email`
 * column and `rl:<action>` in the `ip` column to prevent collision with real
 * password-reset records in the forgotPassword IP query.
 *
 * Migrate to a dedicated generic `rate_limits` table when approved.
 */
export async function checkRateLimit(opts: {
  action: string        // e.g. 'signup', 'recover', 'message', 'review'
  identifier: string    // IP address or user ID
  limit: number         // max attempts allowed within the window
  windowMs: number      // window size in milliseconds
}): Promise<RateLimitResult> {
  const { action, identifier, limit, windowMs } = opts

  const emailKey = `rl:${action}:${identifier}`
  const ipKey    = `rl:${action}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const since = new Date(Date.now() - windowMs).toISOString()

  const { count } = await admin
    .from('password_reset_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('email', emailKey)
    .gte('created_at', since)

  if ((count ?? 0) >= limit) {
    return { limited: true, error: 'Too many attempts. Please try again later.' }
  }

  await admin.from('password_reset_attempts').insert({ email: emailKey, ip: ipKey })
  return { limited: false }
}
