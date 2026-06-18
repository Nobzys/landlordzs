import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminApproveProfessional, adminRejectProfessional, completeOnboarding } from './auth'

beforeEach(() => {
  vi.clearAllMocks()
})

// Generic chainable + awaitable query-builder mock matching the subset of the
// supabase-js fluent API exercised by these actions (select/eq/order/limit/
// single, update, insert). Awaiting at any point in the chain resolves via
// `then`, mirroring how the real PostgrestFilterBuilder works.
function makeBuilder(opts: {
  selectData?: unknown
  updateSpy?: (payload: unknown) => void
  insertSpy?: (payload: unknown) => void
} = {}) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq:     vi.fn(() => builder),
    order:  vi.fn(() => builder),
    limit:  vi.fn(() => builder),
    single: vi.fn(async () => ({ data: opts.selectData ?? null, error: null })),
    update: vi.fn((payload: unknown) => { opts.updateSpy?.(payload); return builder }),
    insert: vi.fn((payload: unknown) => { opts.insertSpy?.(payload); return builder }),
    then:   (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
  }
  return builder
}

function buildCallerClientMock(callerRole: string, callerId = 'admin-1') {
  return {
    auth: { getUser: async () => ({ data: { user: { id: callerId } }, error: null }) },
    from: vi.fn(() => makeBuilder({ selectData: { role: callerRole } })),
  }
}

function buildAdminClientMock(opts: { targetRole: string; kycPending?: boolean }) {
  const profilesUpdateSpy = vi.fn()
  const noticesInsertSpy  = vi.fn()

  const from = vi.fn((table: string) => {
    if (table === 'profiles') {
      return makeBuilder({ selectData: { role: opts.targetRole }, updateSpy: profilesUpdateSpy })
    }
    if (table === 'kyc_records') {
      return makeBuilder({ selectData: opts.kycPending ? { id: 'kyc-1' } : null })
    }
    if (table === 'account_notices') {
      return makeBuilder({ insertSpy: noticesInsertSpy })
    }
    if (table === 'agent_profiles' || table === 'professional_profiles') {
      return makeBuilder()
    }
    throw new Error(`Unexpected admin table queried in test: ${table}`)
  })

  return { client: { from, storage: {} }, profilesUpdateSpy, noticesInsertSpy }
}

describe('adminApproveProfessional', () => {
  it('sets account_status=active and stamps approved_at/approved_by on the target row', async () => {
    vi.mocked(createClient).mockResolvedValue(buildCallerClientMock('admin') as never)
    const { client, profilesUpdateSpy } = buildAdminClientMock({ targetRole: 'seller' })
    vi.mocked(createAdminClient).mockReturnValue(client as never)

    const result = await adminApproveProfessional('target-1')

    expect(result.success).toBe(true)
    expect(profilesUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        account_status: 'active',
        approved_by:    'admin-1',
        approved_at:    expect.any(String),
      })
    )
  })

  it('rejects a non-admin caller before touching the admin client', async () => {
    vi.mocked(createClient).mockResolvedValue(buildCallerClientMock('buyer') as never)
    const createAdminClientSpy = vi.mocked(createAdminClient)

    const result = await adminApproveProfessional('target-1')

    expect(result.error).toBe('Insufficient permissions.')
    expect(createAdminClientSpy).not.toHaveBeenCalled()
  })
})

describe('adminRejectProfessional', () => {
  it('stamps rejected_at/rejected_by, leaves account_status untouched, and records a notice', async () => {
    vi.mocked(createClient).mockResolvedValue(buildCallerClientMock('admin') as never)
    const { client, profilesUpdateSpy, noticesInsertSpy } = buildAdminClientMock({ targetRole: 'vendor' })
    vi.mocked(createAdminClient).mockReturnValue(client as never)

    const result = await adminRejectProfessional('target-1', 'ID document was blurry')

    expect(result.success).toBe(true)
    expect(profilesUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ rejected_by: 'admin-1', rejected_at: expect.any(String) })
    )
    // Resubmittable by design — rejection never sets account_status here.
    expect(profilesUpdateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ account_status: expect.anything() })
    )
    expect(noticesInsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'target-1', type: 'rejection', reason: 'ID document was blurry' })
    )
  })

  it('rejects a non-admin caller before touching the admin client', async () => {
    vi.mocked(createClient).mockResolvedValue(buildCallerClientMock('seller') as never)
    const createAdminClientSpy = vi.mocked(createAdminClient)

    const result = await adminRejectProfessional('target-1', 'reason')

    expect(result.error).toBe('Insufficient permissions.')
    expect(createAdminClientSpy).not.toHaveBeenCalled()
  })
})

describe('completeOnboarding', () => {
  it('stamps registration_completed_at alongside onboarding_completed', async () => {
    const updateSpy = vi.fn()
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn(() => makeBuilder({ selectData: { role: 'buyer' }, updateSpy })),
    }
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await completeOnboarding()

    expect(result.success).toBe(true)
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        onboarding_completed:       true,
        registration_completed_at: expect.any(String),
      })
    )
    expect(result.data?.redirectTo).toBe('/buyer/favorites')
  })
})
