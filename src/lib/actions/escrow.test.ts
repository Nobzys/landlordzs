import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache',      () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/admin',  () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/utils/commission-helpers', () => ({
  lookupPropertyAgent:  vi.fn().mockResolvedValue(null),
  creditAgentCommission: vi.fn().mockResolvedValue(undefined),
}))

import { createClient } from '@/lib/supabase/server'
import { createEscrow, disputeEscrow, completeMilestone } from './escrow'

const USER_ID      = 'a0eebc99-9c0b-4ef8-bb6d-100000000001'
const PAYEE_ID     = 'a0eebc99-9c0b-4ef8-bb6d-100000000002'
const REF_ID       = 'a0eebc99-9c0b-4ef8-bb6d-100000000003'
const ESCROW_ID    = 'a0eebc99-9c0b-4ef8-bb6d-100000000004'
const MILESTONE_ID = 'a0eebc99-9c0b-4ef8-bb6d-100000000005'

const VALID_ESCROW_INPUT = {
  payee_id:       PAYEE_ID,
  amount:         50000,
  reference_type: 'property',
  reference_id:   REF_ID,
}

function makeEscrowCreateClient(userId = USER_ID) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'escrow_accounts') {
        const chain: any = { insert: vi.fn(), select: vi.fn(), single: vi.fn() }
        chain.insert.mockReturnValue(chain)
        chain.select.mockReturnValue(chain)
        chain.single.mockResolvedValue({ data: { id: ESCROW_ID }, error: null })
        return chain
      }
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
    }),
  }
}

function makeEscrowQueryClient(opts: {
  userId?: string
  escrow?: { id: string; payer_id: string; payee_id: string; status: string } | null
  milestone?: { id: string; escrow_id: string; status: string; escrow_accounts: { payee_id: string } } | null
}) {
  const { userId = USER_ID, escrow, milestone } = opts
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null }, error: null }),
    },
    from: vi.fn((table: string) => {
      const chain: any = { select: vi.fn(), eq: vi.fn(), single: vi.fn(), in: vi.fn(), update: vi.fn(), insert: vi.fn() }
      chain.select.mockReturnValue(chain)
      chain.eq.mockReturnValue(chain)
      chain.in.mockReturnValue(chain)
      chain.update.mockReturnValue(chain)
      chain.insert.mockResolvedValue({ data: null, error: null })

      if (table === 'escrow_accounts') {
        chain.single.mockResolvedValue({ data: escrow ?? null, error: null })
        // update chain must be awaitable
        chain.update.mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        })
      } else if (table === 'escrow_milestones') {
        chain.single.mockResolvedValue({ data: milestone ?? null, error: null })
        chain.update.mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        })
      } else {
        chain.single.mockResolvedValue({ data: null, error: null })
      }
      return chain
    }),
  }
}

// ─── createEscrow ────────────────────────────────────────────────────────────

describe('createEscrow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects unauthenticated callers', async () => {
    vi.mocked(createClient).mockResolvedValue(makeEscrowCreateClient('') as any)
    const res = await createEscrow(VALID_ESCROW_INPUT)
    expect(res.error).toBe('Unauthorized')
  })

  it('rejects amount below minimum (10,000 XAF)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeEscrowCreateClient() as any)
    const res = await createEscrow({ ...VALID_ESCROW_INPUT, amount: 5000 })
    expect(res.error).toBeTruthy()
  })

  it('rejects self-escrow (payer === payee)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeEscrowCreateClient(PAYEE_ID) as any)
    const res = await createEscrow({ ...VALID_ESCROW_INPUT, payee_id: PAYEE_ID })
    expect(res.error).toBe('Cannot create escrow with yourself')
  })

  it('happy path: creates escrow and returns id', async () => {
    vi.mocked(createClient).mockResolvedValue(makeEscrowCreateClient() as any)
    const res = await createEscrow(VALID_ESCROW_INPUT)
    expect(res.success).toBe(true)
    expect((res as any).data?.id).toBe(ESCROW_ID)
  })
})

// ─── disputeEscrow ───────────────────────────────────────────────────────────

describe('disputeEscrow', () => {
  beforeEach(() => vi.clearAllMocks())

  const FUNDED_ESCROW = { id: ESCROW_ID, payer_id: USER_ID, payee_id: PAYEE_ID, status: 'funded' }

  it('rejects unauthenticated callers', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeEscrowQueryClient({ userId: '', escrow: FUNDED_ESCROW }) as any
    )
    const res = await disputeEscrow(ESCROW_ID, { reason: 'A'.repeat(25) })
    expect(res.error).toBe('Unauthorized')
  })

  it('rejects reason that is too short', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeEscrowQueryClient({ escrow: FUNDED_ESCROW }) as any
    )
    const res = await disputeEscrow(ESCROW_ID, { reason: 'Too short' })
    expect(res.error).toBeTruthy()
  })

  it('rejects third-party caller (not payer or payee)', async () => {
    const OTHER = 'a0eebc99-9c0b-4ef8-bb6d-100000000099'
    vi.mocked(createClient).mockResolvedValue(
      makeEscrowQueryClient({ userId: OTHER, escrow: FUNDED_ESCROW }) as any
    )
    const res = await disputeEscrow(ESCROW_ID, { reason: 'I want my money back now!' })
    expect(res.error).toBe('Unauthorized')
  })

  it('rejects dispute on non-funded escrow', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeEscrowQueryClient({
        escrow: { ...FUNDED_ESCROW, status: 'pending' },
      }) as any
    )
    const res = await disputeEscrow(ESCROW_ID, { reason: 'Work was not delivered properly.' })
    expect(res.error).toMatch(/funded/i)
  })

  it('happy path: payer can dispute a funded escrow', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeEscrowQueryClient({ escrow: FUNDED_ESCROW }) as any
    )
    const res = await disputeEscrow(ESCROW_ID, { reason: 'Contractor did not complete the work.' })
    expect(res).toEqual({ success: true })
  })
})

// ─── completeMilestone ───────────────────────────────────────────────────────

describe('completeMilestone', () => {
  beforeEach(() => vi.clearAllMocks())

  const PENDING_MILESTONE = {
    id:              MILESTONE_ID,
    escrow_id:       ESCROW_ID,
    status:          'pending',
    escrow_accounts: { payee_id: USER_ID },
  }

  it('rejects unauthenticated callers', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeEscrowQueryClient({ userId: '', milestone: PENDING_MILESTONE }) as any
    )
    const res = await completeMilestone({ milestone_id: MILESTONE_ID })
    expect(res.error).toBe('Unauthorized')
  })

  it('rejects if caller is not the payee', async () => {
    const OTHER = 'a0eebc99-9c0b-4ef8-bb6d-100000000088'
    vi.mocked(createClient).mockResolvedValue(
      makeEscrowQueryClient({
        userId: OTHER,
        milestone: { ...PENDING_MILESTONE, escrow_accounts: { payee_id: USER_ID } },
      }) as any
    )
    const res = await completeMilestone({ milestone_id: MILESTONE_ID })
    expect(res.error).toBe('Only the payee can complete milestones')
  })

  it('rejects milestone that is already completed', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeEscrowQueryClient({
        milestone: { ...PENDING_MILESTONE, status: 'completed' },
      }) as any
    )
    const res = await completeMilestone({ milestone_id: MILESTONE_ID })
    expect(res.error).toMatch(/already/i)
  })

  it('happy path: payee marks milestone complete', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeEscrowQueryClient({ milestone: PENDING_MILESTONE }) as any
    )
    const res = await completeMilestone({ milestone_id: MILESTONE_ID })
    expect(res).toEqual({ success: true })
  })
})
