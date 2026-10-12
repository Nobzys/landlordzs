import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json:   () => Promise.resolve(body),
    }),
  },
}))

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/utils/mtn-momo', () => ({
  mtnGetPaymentStatus:  vi.fn(),
  mtnGetTransferStatus: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { mtnGetPaymentStatus, mtnGetTransferStatus } from '@/lib/utils/mtn-momo'
import { POST } from './route'

const TXN_ID    = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const PAYOUT_ID = 'ffffffff-0000-1111-2222-333333333333'

function makeRequest(body: object): Request {
  return new Request('http://localhost/api/payments/webhook/mtn', {
    method:  'POST',
    body:    JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// Chainable admin client mock — every method returns the same chain so any
// call sequence (.select().eq().eq().single(), .update().eq().eq(), etc.) works
function makeSelectChain(data: unknown) {
  const c: any = { select: () => c, eq: () => c }
  const terminal = Promise.resolve({ data, error: null })
  c.single = () => terminal
  c.then   = terminal.then.bind(terminal)
  c.catch  = terminal.catch.bind(terminal)
  return c
}

function makeUpdateChain(resultData: unknown) {
  const terminal = Promise.resolve({ data: resultData, error: null })
  const c: any   = { update: () => c, select: () => c, eq: () => c }
  c.then  = terminal.then.bind(terminal)
  c.catch = terminal.catch.bind(terminal)
  return c
}

function buildAdminMock({
  txn      = null as Record<string, unknown> | null,
  payout   = null as Record<string, unknown> | null,
  casHit   = true,
}: {
  txn?:    Record<string, unknown> | null
  payout?: Record<string, unknown> | null
  casHit?: boolean
} = {}) {
  const rpc = vi.fn(() => Promise.resolve({ error: null }))
  let txnCount    = 0
  let payoutCount = 0

  const from = vi.fn((table: string) => {
    switch (table) {
      case 'transactions':
        return ++txnCount === 1
          ? makeSelectChain(txn)
          : makeUpdateChain(casHit ? [{ id: TXN_ID }] : [])
      case 'payouts':
        return ++payoutCount === 1
          ? makeSelectChain(payout)
          : makeUpdateChain(casHit ? [{ id: PAYOUT_ID }] : [])
      case 'escrow_accounts':
        return makeUpdateChain(null)
      default:
        return makeUpdateChain(null)
    }
  })

  return { from, rpc }
}

const BASE_TXN = {
  id:         TXN_ID,
  status:     'pending',
  payer_id:   'user-1',
  amount:     10000,
  net_amount: 9700,
  escrow_id:  null,
}

const BASE_PAYOUT = {
  id:           PAYOUT_ID,
  status:       'processing',
  recipient_id: 'user-2',
  amount:       50000,
  net_amount:   48500,
}

describe('MTN webhook — F1 security boundary', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // ─── Input validation ───────────────────────────────────────────────────────

  it('returns 400 on invalid JSON', async () => {
    const req = new Request('http://localhost', {
      method:  'POST',
      body:    'not-json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when referenceId is missing', async () => {
    const res = await POST(makeRequest({ status: 'SUCCESSFUL' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Missing referenceId' })
  })

  it('returns 400 when referenceId is not a valid UUID', async () => {
    const res = await POST(makeRequest({ referenceId: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })

  it('short-circuits on PENDING without calling the provider API', async () => {
    vi.mocked(createAdminClient).mockReturnValue(buildAdminMock() as any)
    const res = await POST(makeRequest({ referenceId: TXN_ID, status: 'PENDING' }))
    expect(res.status).toBe(200)
    expect(vi.mocked(mtnGetPaymentStatus)).not.toHaveBeenCalled()
  })

  // ─── Security: forged callbacks ─────────────────────────────────────────────

  it('[F1] forged SUCCESSFUL callback — MTN confirms FAILED — no wallet credit', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'FAILED', amount: '10000', currency: 'XAF' })

    const res = await POST(makeRequest({ referenceId: TXN_ID, status: 'SUCCESSFUL' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true })
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('[F1] forged callback — referenceId unknown to MTN (404) — no wallet credit', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockRejectedValue(new Error('MTN status check failed 404: Not Found'))

    const res = await POST(makeRequest({ referenceId: TXN_ID, status: 'SUCCESSFUL' }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  // ─── Amount and currency verification ──────────────────────────────────────

  it('rejects when provider returns a different amount — no wallet credit', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '5000', currency: 'XAF' })

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('rejects when provider returns an unexpected currency — no wallet credit', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '10000', currency: 'EUR' })

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('processes when provider omits both amount and currency (sandbox compatibility)', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'SUCCESSFUL' })

    await POST(makeRequest({ referenceId: TXN_ID }))

    expect(admin.rpc).toHaveBeenCalledWith('wallet_transfer', expect.objectContaining({
      p_to_id:  BASE_TXN.payer_id,
      p_amount: BASE_TXN.net_amount,
    }))
  })

  it('processes when provider returns matching amount but omits currency', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '10000' })

    await POST(makeRequest({ referenceId: TXN_ID }))

    expect(admin.rpc).toHaveBeenCalledWith('wallet_transfer', expect.objectContaining({
      p_to_id:  BASE_TXN.payer_id,
    }))
  })

  // ─── Provider errors ────────────────────────────────────────────────────────

  it('returns 200 without crediting when the provider API is unavailable', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockRejectedValue(new Error('fetch failed'))

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('returns 200 without crediting when provider status is still PENDING', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'PENDING' })

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  // ─── Idempotency and CAS ────────────────────────────────────────────────────

  it('is idempotent — duplicate callback for a completed transaction is a no-op', async () => {
    const admin = buildAdminMock({ txn: { ...BASE_TXN, status: 'completed' } })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(vi.mocked(mtnGetPaymentStatus)).not.toHaveBeenCalled()
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('CAS guard prevents double-credit — concurrent callback whose update is lost does not credit', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN, casHit: false })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '10000', currency: 'XAF' })

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  // ─── Happy path ─────────────────────────────────────────────────────────────

  it('verified successful payment credits wallet with net_amount', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '10000', currency: 'XAF' })

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(vi.mocked(mtnGetPaymentStatus)).toHaveBeenCalledWith(TXN_ID)
    expect(admin.rpc).toHaveBeenCalledTimes(1)
    expect(admin.rpc).toHaveBeenCalledWith('wallet_transfer', expect.objectContaining({
      p_to_id:    BASE_TXN.payer_id,
      p_amount:   BASE_TXN.net_amount,
      p_ref_type: 'transaction',
      p_ref_id:   TXN_ID,
    }))
  })

  it('unknown referenceId returns 200 without any DB write or provider call', async () => {
    const admin = buildAdminMock({ txn: null, payout: null })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(vi.mocked(mtnGetPaymentStatus)).not.toHaveBeenCalled()
    expect(vi.mocked(mtnGetTransferStatus)).not.toHaveBeenCalled()
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  // ─── Payout (disbursements) path ────────────────────────────────────────────

  it('[payout] verified successful transfer — marks payout completed, no reversal', async () => {
    const admin = buildAdminMock({ txn: null, payout: BASE_PAYOUT })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetTransferStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '48500', currency: 'XAF' })

    const res = await POST(makeRequest({ referenceId: PAYOUT_ID }))

    expect(res.status).toBe(200)
    expect(vi.mocked(mtnGetTransferStatus)).toHaveBeenCalledWith(PAYOUT_ID)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('[payout] forged SUCCESSFUL — MTN confirms FAILED — triggers wallet reversal', async () => {
    const admin = buildAdminMock({ txn: null, payout: BASE_PAYOUT })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetTransferStatus).mockResolvedValue({ status: 'FAILED', amount: '48500', currency: 'XAF' })

    await POST(makeRequest({ referenceId: PAYOUT_ID, status: 'SUCCESSFUL' }))

    expect(admin.rpc).toHaveBeenCalledWith('wallet_transfer', expect.objectContaining({
      p_to_id:  BASE_PAYOUT.recipient_id,
      p_amount: BASE_PAYOUT.amount,
    }))
  })

  it('[payout] amount mismatch — no status update, no reversal', async () => {
    const admin = buildAdminMock({ txn: null, payout: BASE_PAYOUT })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetTransferStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '99999', currency: 'XAF' })

    const res = await POST(makeRequest({ referenceId: PAYOUT_ID }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })
})
