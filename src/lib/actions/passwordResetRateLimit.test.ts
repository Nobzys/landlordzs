import { describe, it, expect, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { forgotPassword, submitAccountRecoveryRequest } from './auth'

function buildHeadersMock(forwardedFor: string | null) {
  return { get: (key: string) => (key === 'x-forwarded-for' ? forwardedFor : null) }
}

function buildAdminMock(opts: {
  emailCount?: number
  ipCount?: number
  insertError?: { message: string } | null
} = {}) {
  const insert = vi.fn(async () => ({ error: opts.insertError ?? null }))

  const from = vi.fn((table: string) => {
    if (table === 'password_reset_attempts') {
      return {
        select: (_cols: string, _opts: unknown) => ({
          eq: (col: string) => ({
            gte: async () => ({
              count: col === 'email' ? opts.emailCount ?? 0 : opts.ipCount ?? 0,
            }),
          }),
        }),
        insert,
      }
    }
    if (table === 'account_recovery_requests') {
      return { insert }
    }
    throw new Error(`Unexpected table queried in test: ${table}`)
  })

  return { from }
}

function buildSupabaseAuthMock(opts: { resetError?: { message: string } | null } = {}) {
  return {
    auth: {
      resetPasswordForEmail: vi.fn(async () => ({ error: opts.resetError ?? null })),
    },
  }
}

describe('forgotPassword rate limiting (Sprint 1, Task 3)', () => {
  it('sends the reset email when under the rate limit', async () => {
    vi.mocked(headers).mockResolvedValue(buildHeadersMock('203.0.113.5') as never)
    vi.mocked(createAdminClient).mockReturnValue(buildAdminMock({ emailCount: 0, ipCount: 0 }) as never)
    vi.mocked(createClient).mockResolvedValue(buildSupabaseAuthMock() as never)

    const result = await forgotPassword({ email: 'jean@example.com' })

    expect(result.error).toBeUndefined()
    expect(result.success).toBe(true)
  })

  it('blocks the request once the same email has hit the limit', async () => {
    vi.mocked(headers).mockResolvedValue(buildHeadersMock('203.0.113.5') as never)
    vi.mocked(createAdminClient).mockReturnValue(buildAdminMock({ emailCount: 3, ipCount: 0 }) as never)
    vi.mocked(createClient).mockResolvedValue(buildSupabaseAuthMock() as never)

    const result = await forgotPassword({ email: 'jean@example.com' })

    expect(result.error).toBe('Too many requests. Please try again later.')
  })

  it('blocks the request once the same IP has hit the limit, even with a different email', async () => {
    vi.mocked(headers).mockResolvedValue(buildHeadersMock('203.0.113.5') as never)
    vi.mocked(createAdminClient).mockReturnValue(buildAdminMock({ emailCount: 0, ipCount: 3 }) as never)
    vi.mocked(createClient).mockResolvedValue(buildSupabaseAuthMock() as never)

    const result = await forgotPassword({ email: 'someone-else@example.com' })

    expect(result.error).toBe('Too many requests. Please try again later.')
  })

  it('falls back to "unknown" when x-forwarded-for is absent, without throwing', async () => {
    vi.mocked(headers).mockResolvedValue(buildHeadersMock(null) as never)
    vi.mocked(createAdminClient).mockReturnValue(buildAdminMock({ emailCount: 0, ipCount: 0 }) as never)
    vi.mocked(createClient).mockResolvedValue(buildSupabaseAuthMock() as never)

    const result = await forgotPassword({ email: 'jean@example.com' })

    expect(result.error).toBeUndefined()
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email before touching Supabase', async () => {
    const result = await forgotPassword({ email: 'not-an-email' })
    expect(result.error).toBeTruthy()
  })

  it('surfaces a Supabase resetPasswordForEmail error', async () => {
    vi.mocked(headers).mockResolvedValue(buildHeadersMock('203.0.113.5') as never)
    vi.mocked(createAdminClient).mockReturnValue(buildAdminMock({ emailCount: 0, ipCount: 0 }) as never)
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseAuthMock({ resetError: { message: 'Email service unavailable' } }) as never
    )

    const result = await forgotPassword({ email: 'jean@example.com' })
    expect(result.error).toBe('Email service unavailable')
  })
})

describe('submitAccountRecoveryRequest (Sprint 1, Task 3)', () => {
  const valid = {
    full_name: 'Jean Dupont',
    phone: '+237678123456',
    alternative_email: 'jean.alt@example.com',
    note: 'I lost access to my old email.',
  }

  it('captures a valid recovery request', async () => {
    vi.mocked(createAdminClient).mockReturnValue(buildAdminMock() as never)

    const result = await submitAccountRecoveryRequest(valid)

    expect(result.error).toBeUndefined()
    expect(result.success).toBe(true)
  })

  it('rejects an invalid phone number before touching Supabase', async () => {
    const result = await submitAccountRecoveryRequest({ ...valid, phone: '12345' })
    expect(result.error).toBeTruthy()
  })

  it('surfaces an insert failure as a generic error', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      buildAdminMock({ insertError: { message: 'db down' } }) as never
    )

    const result = await submitAccountRecoveryRequest(valid)
    expect(result.error).toBe('Could not submit your request. Please try again.')
  })
})
