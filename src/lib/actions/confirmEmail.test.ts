import { describe, it, expect, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { confirmEmail } from './auth'

function buildAuthClientMock(opts: { error?: { message: string } | null } = {}) {
  return {
    auth: {
      verifyOtp: vi.fn(async () => ({ error: opts.error ?? null })),
    },
  }
}

describe('confirmEmail (click-to-confirm, otp_expired fix)', () => {
  it('consumes the token via verifyOtp and redirects to onboarding on success', async () => {
    const authMock = buildAuthClientMock()
    vi.mocked(createClient).mockResolvedValue(authMock as never)

    const result = await confirmEmail({ token_hash: 'hash-1', type: 'signup' })

    expect(authMock.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash-1', type: 'signup' })
    expect(result.error).toBeUndefined()
    expect(result.success).toBe(true)
    expect(result.data?.redirectTo).toBe('/onboarding')
  })

  it('surfaces the Supabase error when the token is expired or already used', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildAuthClientMock({ error: { message: 'Token has expired or is invalid' } }) as never
    )

    const result = await confirmEmail({ token_hash: 'hash-1', type: 'signup' })

    expect(result.error).toBe('Token has expired or is invalid')
    expect(result.success).toBeUndefined()
  })

  it('rejects a payload with a missing token_hash before calling Supabase', async () => {
    const authMock = buildAuthClientMock()
    vi.mocked(createClient).mockResolvedValue(authMock as never)

    const result = await confirmEmail({ token_hash: '', type: 'signup' })

    expect(result.error).toBeTruthy()
    expect(authMock.auth.verifyOtp).not.toHaveBeenCalled()
  })

  it('rejects a payload with an invalid type before calling Supabase', async () => {
    const authMock = buildAuthClientMock()
    vi.mocked(createClient).mockResolvedValue(authMock as never)

    const result = await confirmEmail({ token_hash: 'hash-1', type: 'not-a-real-type' as never })

    expect(result.error).toBeTruthy()
    expect(authMock.auth.verifyOtp).not.toHaveBeenCalled()
  })
})
