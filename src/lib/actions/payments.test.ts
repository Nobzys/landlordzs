import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache',      () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/admin',  () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/utils/mtn-momo',    () => ({ mtnRequestToPay: vi.fn().mockResolvedValue({ referenceId: 'mtn-ref' }) }))
vi.mock('@/lib/utils/orange-money', () => ({ orangeRequestToPay: vi.fn().mockResolvedValue({ paymentRef: 'om-ref' }) }), { virtual: true })

import { createClient }     from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { initiatePayment, requestPayout } from './payments'

const USER_ID  = 'a0eebc99-9c0b-4ef8-bb6d-300000000001'
const TXN_ID   = 'a0eebc99-9c0b-4ef8-bb6d-300000000002'

// ─── Mock builders ───────────────────────────────────────────────────────────

function makePaymentClient(opts: {
  userId?: string | null
  walletBalance?: number
  insertError?: string | null
  rpcError?: string | null
}) {
  const { userId = USER_ID, walletBalance = 500000, insertError = null, rpcError = null } = opts

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: userId ? null : new Error('no session'),
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'wallets') {
        const chain: any = { select: vi.fn(), eq: vi.fn(), single: vi.fn() }
        chain.select.mockReturnValue(chain)
        chain.eq.mockReturnValue(chain)
        chain.single.mockResolvedValue({ data: { balance: walletBalance, locked: 0 } })
        return chain
      }
      if (table === 'transactions') {
        return {
          insert: vi.fn().mockResolvedValue({ data: { id: TXN_ID }, error: insertError ? { message: insertError } : null }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        }
      }
      if (table === 'platform_settings') {
        const chain: any = { select: vi.fn(), eq: vi.fn(), single: vi.fn() }
        chain.select.mockReturnValue(chain)
        chain.eq.mockReturnValue(chain)
        chain.single.mockResolvedValue({ data: { value: '5000' } })
        return chain
      }
      if (table === 'payouts') {
        const chain: any = { insert: vi.fn() }
        chain.insert.mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'payout-id' }, error: null }),
          }),
        })
        return chain
      }
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: rpcError ? { message: rpcError } : null }),
  }
}

function makeAdminChain() {
  return {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
}

// ─── initiatePayment ─────────────────────────────────────────────────────────

describe('initiatePayment', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects unauthenticated callers', async () => {
    vi.mocked(createClient).mockResolvedValue(makePaymentClient({ userId: null }) as any)
    const res = await initiatePayment({ amount: 5000, provider: 'wallet' })
    expect(res.error).toBe('Unauthorized')
  })

  it('rejects amount below minimum (100 XAF)', async () => {
    vi.mocked(createClient).mockResolvedValue(makePaymentClient({}) as any)
    const res = await initiatePayment({ amount: 50, provider: 'wallet' })
    expect(res.error).toBeTruthy()
  })

  it('rejects wallet payment with insufficient balance', async () => {
    vi.mocked(createClient).mockResolvedValue(makePaymentClient({ walletBalance: 100 }) as any)
    const res = await initiatePayment({ amount: 50000, provider: 'wallet' })
    expect(res.error).toMatch(/insufficient/i)
  })

  it('requires phone for mtn_momo provider', async () => {
    vi.mocked(createClient).mockResolvedValue(makePaymentClient({}) as any)
    const res = await initiatePayment({ amount: 5000, provider: 'mtn_momo' })
    expect(res.error).toMatch(/phone/i)
  })

  it('happy path: wallet payment returns success', async () => {
    vi.mocked(createClient).mockResolvedValue(makePaymentClient({}) as any)
    const res = await initiatePayment({ amount: 5000, provider: 'wallet' })
    expect(res.success).toBe(true)
    expect((res as any).data?.transaction_id).toBeTruthy()
  })
})

// ─── requestPayout ───────────────────────────────────────────────────────────

describe('requestPayout', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects unauthenticated callers', async () => {
    vi.mocked(createClient).mockResolvedValue(makePaymentClient({ userId: null }) as any)
    const res = await requestPayout({ amount: 10000, provider: 'mtn_momo', phone: '+237650000001' })
    expect(res.error).toBe('Unauthorized')
  })

  it('rejects amount below platform minimum (5000 XAF)', async () => {
    vi.mocked(createClient).mockResolvedValue(makePaymentClient({}) as any)
    const res = await requestPayout({ amount: 100, provider: 'mtn_momo', phone: '+237650000001' })
    expect(res.error).toMatch(/minimum/i)
  })

  it('rejects invalid phone number format', async () => {
    vi.mocked(createClient).mockResolvedValue(makePaymentClient({}) as any)
    const res = await requestPayout({ amount: 10000, provider: 'mtn_momo', phone: '0701234567' })
    expect(res.error).toBeTruthy()
  })

  it('rejects payout if available balance is too low', async () => {
    vi.mocked(createClient).mockResolvedValue(makePaymentClient({ walletBalance: 1000 }) as any)
    const res = await requestPayout({ amount: 50000, provider: 'mtn_momo', phone: '+237650000001' })
    expect(res.error).toMatch(/insufficient/i)
  })

  it('happy path: creates payout and returns id', async () => {
    vi.mocked(createClient).mockResolvedValue(makePaymentClient({}) as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminChain() as any)
    const res = await requestPayout({ amount: 10000, provider: 'mtn_momo', phone: '+237650000001' })
    expect(res.success).toBe(true)
    expect((res as any).data?.id).toBeTruthy()
  })
})
