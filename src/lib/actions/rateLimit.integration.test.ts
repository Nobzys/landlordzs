/**
 * Integration tests verifying that the four rate-limited server actions
 * (signUp, submitAccountRecoveryRequest, sendMessage, createReview) honour
 * the checkRateLimit gate introduced in Task 25.1.
 *
 * These tests mock checkRateLimit itself — unit tests for the utility live
 * in src/lib/utils/rateLimit.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache',      () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/headers',    () => ({ headers: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin',  () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/utils/rateLimit', () => ({ checkRateLimit: vi.fn() }))

import { headers }         from 'next/headers'
import { createClient }    from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit }  from '@/lib/utils/rateLimit'
import { signUp, submitAccountRecoveryRequest } from './auth'
import { sendMessage }     from './messaging'
import { createReview }    from './reviews'

// ─── helpers ─────────────────────────────────────────────────────────────────

const RATE_LIMITED = { limited: true,  error: 'Too many attempts. Please try again later.' }
const NOT_LIMITED  = { limited: false }

function mockNotLimited() {
  vi.mocked(checkRateLimit).mockResolvedValue(NOT_LIMITED)
}
function mockLimited() {
  vi.mocked(checkRateLimit).mockResolvedValue(RATE_LIMITED)
}

function makeHeadersMock(forwardedFor = '1.2.3.4') {
  return { get: (k: string) => k === 'x-forwarded-for' ? forwardedFor : k === 'host' ? 'localhost:3000' : null }
}

const validSignUpInput = {
  full_name:        'Alice Test',
  email:            'alice@example.com',
  password:         'Str0ng!Pass',
  confirm_password: 'Str0ng!Pass',
  role:             'buyer' as const,
}

const validRecoveryInput = {
  full_name:         'Alice Test',
  phone:             '+237678123456',
  alternative_email: 'alice.alt@example.com',
  note:              'Lost access.',
}

// ─── signUp ──────────────────────────────────────────────────────────────────

describe('signUp — rate limiting (Task 25.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(headers).mockResolvedValue(makeHeadersMock() as any)
    delete process.env.SKIP_EMAIL_VERIFICATION
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it('blocks a rate-limited IP before touching Supabase auth', async () => {
    mockLimited()

    const res = await signUp(validSignUpInput)

    expect(res.error).toBe('Too many attempts. Please try again later.')
    expect(vi.mocked(createClient)).not.toHaveBeenCalled()
  })

  it('proceeds normally when under the limit', async () => {
    mockNotLimited()
    vi.mocked(createClient).mockResolvedValue({
      auth: { signUp: vi.fn(async () => ({ data: { user: { id: 'u1' }, session: null }, error: null })) },
    } as any)

    const res = await signUp(validSignUpInput)

    expect(res.error).toBeUndefined()
    expect(res.success).toBe(true)
    expect(vi.mocked(checkRateLimit)).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'signup', limit: 5 })
    )
  })

  it('Path A (SKIP_EMAIL_VERIFICATION) bypasses rate limiting', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key'
    process.env.SKIP_EMAIL_VERIFICATION   = 'true'
    // checkRateLimit would reject if called — but Path A must never call it
    mockLimited()

    const adminCreateUser = vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null }))
    vi.mocked(createAdminClient).mockReturnValue({
      auth: { admin: { createUser: adminCreateUser } },
      from: () => ({ upsert: vi.fn(async () => ({ error: null })) }),
    } as any)

    const res = await signUp(validSignUpInput)

    // Path A succeeds; checkRateLimit was never called for Path A
    expect(res.success).toBe(true)
    expect(vi.mocked(checkRateLimit)).not.toHaveBeenCalled()
  })
})

// ─── submitAccountRecoveryRequest ────────────────────────────────────────────

describe('submitAccountRecoveryRequest — rate limiting (Task 25.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(headers).mockResolvedValue(makeHeadersMock() as any)
  })

  it('blocks a rate-limited IP before inserting the recovery request', async () => {
    mockLimited()

    const res = await submitAccountRecoveryRequest(validRecoveryInput)

    expect(res.error).toBe('Too many attempts. Please try again later.')
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled()
  })

  it('proceeds normally when under the limit', async () => {
    mockNotLimited()
    vi.mocked(createAdminClient).mockReturnValue({
      from: () => ({ insert: vi.fn(async () => ({ error: null })) }),
    } as any)

    const res = await submitAccountRecoveryRequest(validRecoveryInput)

    expect(res.success).toBe(true)
    expect(vi.mocked(checkRateLimit)).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'recover', limit: 3 })
    )
  })
})

// ─── sendMessage ─────────────────────────────────────────────────────────────

describe('sendMessage — rate limiting (Task 25.1)', () => {
  beforeEach(() => vi.clearAllMocks())

  function makeMessagingClient(userId: string) {
    const chain: any = {
      select:     vi.fn(() => chain),
      eq:         vi.fn(() => chain),
      is:         vi.fn(() => chain),
      insert:     vi.fn(() => chain),
      maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'participant-1' }, error: null })),
      single:     vi.fn(() => Promise.resolve({ data: { id: 'msg-1' }, error: null })),
    }
    return {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: userId } }, error: null })) },
      from: vi.fn(() => chain),
    }
  }

  it('blocks a rate-limited user before querying the conversation', async () => {
    mockLimited()
    // createClient is called by requireAuth — must return a user so auth passes
    vi.mocked(createClient).mockResolvedValue(makeMessagingClient('user-1') as any)

    const res = await sendMessage({ conversationId: 'conv-1', content: 'hello' })

    expect(res.error).toBe('Too many attempts. Please try again later.')
    expect(vi.mocked(checkRateLimit)).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'message', identifier: 'user-1', limit: 100 })
    )
  })

  it('proceeds normally when under the limit', async () => {
    mockNotLimited()
    vi.mocked(createClient).mockResolvedValue(makeMessagingClient('user-1') as any)
    vi.mocked(createAdminClient).mockReturnValue({
      from: () => ({
        select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      }),
    } as any)

    const res = await sendMessage({ conversationId: 'conv-1', content: 'hello' })

    expect(res.error).toBeUndefined()
  })
})

// ─── createReview ─────────────────────────────────────────────────────────────

describe('createReview — rate limiting (Task 25.1)', () => {
  beforeEach(() => vi.clearAllMocks())

  function makeReviewClient(userId: string, { requestStatus = 'completed' } = {}) {
    const chain: any = {
      select:      vi.fn(() => chain),
      eq:          vi.fn(() => chain),
      insert:      vi.fn(() => chain),
      maybeSingle: vi.fn().mockResolvedValueOnce({ data: { id: 'req-1', client_id: userId, status: requestStatus }, error: null })
                          .mockResolvedValueOnce({ data: { provider_id: 'prov-1' }, error: null })
                          .mockResolvedValueOnce({ data: { role: 'contractor' }, error: null }),
      single:      vi.fn(() => Promise.resolve({ data: { id: 'rev-1' }, error: null })),
    }
    return {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: userId } }, error: null })) },
      from: vi.fn(() => chain),
    }
  }

  const REVIEW_REQUEST_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

  it('blocks a rate-limited user before querying the service request', async () => {
    mockLimited()
    vi.mocked(createClient).mockResolvedValue(makeReviewClient('user-1') as any)

    const res = await createReview({
      service_request_id: REVIEW_REQUEST_ID,
      rating: 5,
      title: 'Great',
      body: 'Excellent work',
    })

    expect(res.error).toBe('Too many attempts. Please try again later.')
    expect(vi.mocked(checkRateLimit)).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'review', identifier: 'user-1', limit: 5 })
    )
  })

  it('proceeds normally when under the limit', async () => {
    mockNotLimited()
    vi.mocked(createClient).mockResolvedValue(makeReviewClient('user-1') as any)

    const res = await createReview({
      service_request_id: REVIEW_REQUEST_ID,
      rating: 5,
      title: 'Great',
      body: 'Excellent work',
    })

    expect(res.error).toBeUndefined()
  })
})
