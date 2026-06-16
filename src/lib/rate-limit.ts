/**
 * Database-backed rate limiter using the rate_limit_log table.
 *
 * Works across serverless instances (unlike in-memory maps).
 * Fails open on DB errors so legitimate users are never blocked by infra issues.
 *
 * Usage in server actions:
 *   const limit = await checkRateLimit('sign_in', 10, 900)  // 10 per 15 min
 *   if (!limit.allowed) return { error: limit.message }
 */

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter?: number
  message?: string
}

// Configurable limits per endpoint key
export const RATE_LIMITS = {
  sign_in:        { limit: 10,  windowSeconds: 900  },   // 10 / 15 min
  sign_up:        { limit: 5,   windowSeconds: 3600 },   // 5 / hour
  forgot_password:{ limit: 5,   windowSeconds: 3600 },   // 5 / hour
  send_phone_otp: { limit: 5,   windowSeconds: 3600 },   // 5 / hour
  verify_phone:   { limit: 10,  windowSeconds: 3600 },   // 10 / hour
  search_api:     { limit: 120, windowSeconds: 60   },   // 120 / min
  service_request:{ limit: 10,  windowSeconds: 3600 },   // 10 / hour
  review:         { limit: 5,   windowSeconds: 86400},   // 5 / day
  contact:        { limit: 10,  windowSeconds: 3600 },   // 10 / hour
} as const

export type RateLimitEndpoint = keyof typeof RATE_LIMITS

async function getClientIp(): Promise<string> {
  try {
    const h = await headers()
    return (
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      h.get('x-real-ip') ??
      'unknown'
    )
  } catch {
    return 'unknown'
  }
}

export async function checkRateLimit(
  endpoint: RateLimitEndpoint,
  overrideLimit?: number,
  overrideWindowSeconds?: number,
): Promise<RateLimitResult> {
  const cfg           = RATE_LIMITS[endpoint]
  const limit         = overrideLimit         ?? cfg.limit
  const windowSeconds = overrideWindowSeconds ?? cfg.windowSeconds

  const ip  = await getClientIp()
  const key = `${ip}:${endpoint}`

  try {
    const adminClient = createAdminClient()
    const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString()

    // Count existing attempts within window
    const { count } = await (adminClient as any)
      .from('rate_limit_log')
      .select('id', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', windowStart) as { count: number | null }

    const current = count ?? 0

    if (current >= limit) {
      return {
        allowed:    false,
        remaining:  0,
        retryAfter: windowSeconds,
        message:    `Too many attempts. Please try again in ${Math.ceil(windowSeconds / 60)} minute${windowSeconds >= 120 ? 's' : ''}.`,
      }
    }

    // Record this attempt (fire and forget — don't block on it)
    ;(adminClient as any).from('rate_limit_log').insert({ key }).then(() => {})

    return {
      allowed:   true,
      remaining: limit - current - 1,
    }
  } catch {
    // Fail open: if the DB check fails, allow the request
    return { allowed: true, remaining: limit }
  }
}
