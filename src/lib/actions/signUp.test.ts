import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signUp } from './auth'

const validInput = {
  full_name: 'Jean Dupont',
  email: 'jean@example.com',
  password: 'Str0ng!Pass',
  confirm_password: 'Str0ng!Pass',
  role: 'buyer' as const,
}

function buildHeadersMock() {
  return { get: (key: string) => (key === 'host' ? 'landlordzs.com' : null) }
}

function buildAuthClientMock(opts: {
  session?: object | null
  user?: object | null
  signUpError?: { message: string } | null
} = {}) {
  return {
    auth: {
      signUp: vi.fn(async () => ({
        data: {
          user:    opts.user === undefined ? { id: 'user-1' } : opts.user,
          session: opts.session ?? null,
        },
        error: opts.signUpError ?? null,
      })),
    },
  }
}

const ORIGINAL_ENV = { ...process.env }

describe('signUp (Sprint 1 + email-confirmation bug fix)', () => {
  beforeEach(() => {
    vi.mocked(headers).mockResolvedValue(buildHeadersMock() as never)
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.SKIP_EMAIL_VERIFICATION
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('does not treat data.user as a successful login when session is null (email confirmation required)', async () => {
    vi.mocked(createClient).mockResolvedValue(buildAuthClientMock({ session: null }) as never)

    const result = await signUp(validInput)

    expect(result.error).toBeUndefined()
    expect(result.success).toBe(true)
    expect(result.data?.sessionCreated).toBeUndefined()
    expect(result.data?.redirectTo).toBeUndefined()
    expect(result.data?.email).toBe('jean@example.com')
  })

  it('reports sessionCreated + redirectTo only when Supabase itself returns a session', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildAuthClientMock({ session: { access_token: 'tok' } }) as never
    )

    const result = await signUp(validInput)

    expect(result.error).toBeUndefined()
    expect(result.data?.sessionCreated).toBe(true)
    expect(result.data?.redirectTo).toBe('/onboarding')
  })

  it('does not use the admin pre-confirm path merely because SUPABASE_SERVICE_ROLE_KEY is set', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-key'
    const authMock = buildAuthClientMock({ session: null })
    vi.mocked(createClient).mockResolvedValue(authMock as never)
    const adminCreateUser = vi.fn()
    vi.mocked(createAdminClient).mockReturnValue({ auth: { admin: { createUser: adminCreateUser } } } as never)

    const result = await signUp(validInput)

    expect(adminCreateUser).not.toHaveBeenCalled()
    expect(authMock.auth.signUp).toHaveBeenCalled()
    expect(result.data?.skipVerification).toBeUndefined()
  })

  it('uses the admin pre-confirm path only when SKIP_EMAIL_VERIFICATION=true is explicitly set', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-key'
    process.env.SKIP_EMAIL_VERIFICATION = 'true'

    const adminCreateUser = vi.fn(async () => ({
      data: { user: { id: 'user-1' } },
      error: null,
    }))
    const upsert = vi.fn(async () => ({ error: null }))
    vi.mocked(createAdminClient).mockReturnValue({
      auth: { admin: { createUser: adminCreateUser } },
      from: () => ({ upsert }),
    } as never)

    const result = await signUp(validInput)

    expect(adminCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jean@example.com', email_confirm: true })
    )
    expect(result.data?.skipVerification).toBe(true)
  })

  it('rejects an invalid registration payload before calling Supabase', async () => {
    const result = await signUp({ ...validInput, password: 'weak' })
    expect(result.error).toBeTruthy()
  })

  it('surfaces "already registered" as a friendly error', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildAuthClientMock({ session: null, signUpError: { message: 'User already registered' } }) as never
    )

    const result = await signUp(validInput)
    expect(result.error).toBe('An account with this email already exists.')
  })

  it('returns an error when Supabase signUp produces no user and no error', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildAuthClientMock({ session: null, user: null }) as never
    )

    const result = await signUp(validInput)
    expect(result.error).toBe('Registration failed. Please try again.')
  })
})
