import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache',      () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/utils/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ limited: false }),
}))

import { createClient }  from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { createReview }  from './reviews'

const USER_ID      = 'a0eebc99-9c0b-4ef8-bb6d-200000000001'
const PROVIDER_ID  = 'a0eebc99-9c0b-4ef8-bb6d-200000000002'
const REQUEST_ID   = 'a0eebc99-9c0b-4ef8-bb6d-200000000003'
const REVIEW_ID    = 'a0eebc99-9c0b-4ef8-bb6d-200000000004'

const VALID_INPUT = {
  service_request_id: REQUEST_ID,
  rating: 4,
  title:  'Great work',
  body:   'Very professional.',
}

function buildReviewClient(opts: {
  userId?: string | null
  request?: { id: string; client_id: string; status: string } | null
  quotation?: { provider_id: string } | null
  providerRole?: string | null
  insertError?: { message: string; code: string } | null
}) {
  const {
    userId      = USER_ID,
    request     = { id: REQUEST_ID, client_id: USER_ID, status: 'completed' },
    quotation   = { provider_id: PROVIDER_ID },
    providerRole= 'contractor',
    insertError = null,
  } = opts

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'service_requests') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: request, error: null }) }) }),
        }
      }
      if (table === 'service_quotations') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: quotation, error: null }) }) }) }),
        }
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: providerRole ? { role: providerRole } : null,
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'reviews') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: insertError ? null : { id: REVIEW_ID },
                error: insertError,
              }),
            }),
          }),
        }
      }
      return {}
    }),
  }
}

// ─── createReview ────────────────────────────────────────────────────────────

describe('createReview', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects unauthenticated callers', async () => {
    vi.mocked(createClient).mockResolvedValue(buildReviewClient({ userId: null }) as any)
    const res = await createReview(VALID_INPUT)
    expect(res.error).toBe('Not authenticated.')
  })

  it('rejects when rate limit is hit', async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ limited: true, error: 'Too many reviews.' })
    vi.mocked(createClient).mockResolvedValue(buildReviewClient({}) as any)
    const res = await createReview(VALID_INPUT)
    expect(res.error).toBe('Too many reviews.')
  })

  it('rejects when service request is not found', async () => {
    vi.mocked(createClient).mockResolvedValue(buildReviewClient({ request: null }) as any)
    const res = await createReview(VALID_INPUT)
    expect(res.error).toBe('Service request not found.')
  })

  it('rejects when caller is not the client on the request', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildReviewClient({ request: { id: REQUEST_ID, client_id: PROVIDER_ID, status: 'completed' } }) as any
    )
    const res = await createReview(VALID_INPUT)
    expect(res.error).toMatch(/own service requests/i)
  })

  it('rejects when request is not yet completed', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildReviewClient({ request: { id: REQUEST_ID, client_id: USER_ID, status: 'in_progress' } }) as any
    )
    const res = await createReview(VALID_INPUT)
    expect(res.error).toMatch(/not been completed/i)
  })

  it('rejects when no accepted quotation exists', async () => {
    vi.mocked(createClient).mockResolvedValue(buildReviewClient({ quotation: null }) as any)
    const res = await createReview(VALID_INPUT)
    expect(res.error).toMatch(/No accepted professional/i)
  })

  it('rejects duplicate review (Postgres unique violation)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildReviewClient({ insertError: { code: '23505', message: 'duplicate key value' } }) as any
    )
    const res = await createReview(VALID_INPUT)
    expect(res.error).toBe('You have already reviewed this professional.')
  })

  it('rejects rating out of valid range', async () => {
    vi.mocked(createClient).mockResolvedValue(buildReviewClient({}) as any)
    const res = await createReview({ ...VALID_INPUT, rating: 10 })
    expect(res.error).toBeTruthy()
  })

  it('happy path: creates review and returns id', async () => {
    vi.mocked(createClient).mockResolvedValue(buildReviewClient({}) as any)
    const res = await createReview(VALID_INPUT)
    expect(res.success).toBe(true)
    expect((res as any).data?.id).toBe(REVIEW_ID)
  })
})
