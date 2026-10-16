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

// Chainable admin client mock — select chain for reads, update chain for payout SUCCESSFUL path
function makeSelectChain(data: unknown) {
  const c: any = { select: () => c, eq: () => c }
  const terminal = Promise.resolve({ data, error: null })
  c.single = () => terminal
  c.then   = terminal.then.bind(terminal)
  c.catch  = terminal.catch.bind(terminal)
  return c
}

function makeUpdateChain(resultData: unknown, err: unknown = null) {
  const terminal = Promise.resolve({ data: resultData, error: err })
  const c: any   = { update: () => c, select: () => c, eq: () => c }
  c.then  = terminal.then.bind(terminal)
  c.catch = terminal.catch.bind(terminal)
  return c
}

// Build admin client mock that:
//   - Returns txn on first from('transactions') call (SELECT)
//   - Returns payout on first from('payouts') call (SELECT)
//   - Returns casHit result on second from('payouts') call (UPDATE — payout SUCCESSFUL path)
//   - rpc() returns the configured finalize / reverse results
function buildAdminMock({
  txn               = null  as Record<string, unknown> | null,
  payout            = null  as Record<string, unknown> | null,
  payoutCasHit      = true,
  finalizeResult    = 'completed_and_credited' as string | null,
  finalizeRpcErr    = null  as string | null,
  reverseResult     = 'reversed' as string | null,
  reverseRpcErr     = null  as string | null,
}: {
  txn?:            Record<string, unknown> | null
  payout?:         Record<string, unknown> | null
  payoutCasHit?:   boolean
  finalizeResult?: string | null
  finalizeRpcErr?: string | null
  reverseResult?:  string | null
  reverseRpcErr?:  string | null
} = {}) {
  let txnCount    = 0
  let payoutCount = 0

  const rpc = vi.fn((name: string) => {
    if (name === 'finalize_payment_webhook') {
      return Promise.resolve({
        data:  finalizeRpcErr ? null : finalizeResult,
        error: finalizeRpcErr ? { message: finalizeRpcErr } : null,
      })
    }
    if (name === 'reverse_mtn_payout') {
      return Promise.resolve({
        data:  reverseRpcErr ? null : reverseResult,
        error: reverseRpcErr ? { message: reverseRpcErr } : null,
      })
    }
    return Promise.resolve({ data: null, error: null })
  })

  const from = vi.fn((table: string) => {
    switch (table) {
      case 'transactions':
        ++txnCount
        return makeSelectChain(txn)
      case 'payouts':
        return ++payoutCount === 1
          ? makeSelectChain(payout)
          : makeUpdateChain(payoutCasHit ? [{ id: PAYOUT_ID }] : [])
      default:
        return makeUpdateChain(null)
    }
  })

  return { from, rpc }
}

const BASE_TXN = {
  id:         TXN_ID,
  status:     'processing',
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

describe('MTN webhook — financial integrity', () => {
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

  it('[F1] forged SUCCESSFUL — provider confirms FAILED — no wallet credit', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN, finalizeResult: 'failed' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'FAILED', amount: '10000', currency: 'XAF' })

    const res = await POST(makeRequest({ referenceId: TXN_ID, status: 'SUCCESSFUL' }))

    expect(res.status).toBe(200)
    expect(admin.rpc).toHaveBeenCalledWith('finalize_payment_webhook',
      expect.objectContaining({ p_txn_id: TXN_ID, p_new_status: 'failed' }))
  })

  it('[F1] forged callback — provider returns 404 — no finalize call', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockRejectedValue(new Error('MTN 404'))

    const res = await POST(makeRequest({ referenceId: TXN_ID, status: 'SUCCESSFUL' }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  // ─── Amount and currency verification ──────────────────────────────────────

  it('rejects when provider returns a different amount', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '5000', currency: 'XAF' })

    await POST(makeRequest({ referenceId: TXN_ID }))

    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('rejects when provider returns an unexpected currency', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '10000', currency: 'EUR' })

    await POST(makeRequest({ referenceId: TXN_ID }))

    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('processes when provider omits both amount and currency (sandbox)', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'SUCCESSFUL' })

    await POST(makeRequest({ referenceId: TXN_ID }))

    expect(admin.rpc).toHaveBeenCalledWith('finalize_payment_webhook',
      expect.objectContaining({ p_new_status: 'completed' }))
  })

  // ─── Provider errors ────────────────────────────────────────────────────────

  it('returns 200 without side-effects when provider API is unavailable', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockRejectedValue(new Error('fetch failed'))

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('returns 200 without side-effects when provider status is still PENDING', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'PENDING' })

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  // ─── Idempotency (scenario 2 & 15) ─────────────────────────────────────────

  it('is idempotent — completed transaction: no provider call, no finalize call', async () => {
    const admin = buildAdminMock({ txn: { ...BASE_TXN, status: 'completed' } })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(vi.mocked(mtnGetPaymentStatus)).not.toHaveBeenCalled()
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  // ─── Atomicity and concurrency (scenarios 3 & 6) ───────────────────────────

  it('finalize returns already_terminal — returns 200 without duplicate credit', async () => {
    // Simulates: provider verifies SUCCESSFUL, but by the time finalize runs,
    // another concurrent delivery has already completed the transaction.
    const admin = buildAdminMock({ txn: BASE_TXN, finalizeResult: 'already_terminal' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '10000', currency: 'XAF' })

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(admin.rpc).toHaveBeenCalledTimes(1)
  })

  it('finalize returns cas_missed — returns 200 without duplicate credit', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN, finalizeResult: 'cas_missed' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '10000', currency: 'XAF' })

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(admin.rpc).toHaveBeenCalledTimes(1)
  })

  // ─── Wallet RPC failure (scenarios 4 & 5) ──────────────────────────────────

  it('finalize RPC error — returns 200 (does not retry; transaction stays in pre-call state)', async () => {
    // Simulates: DB error inside finalize_payment_webhook — entire DB transaction
    // rolled back, including the status update.  Transaction stays processing.
    const admin = buildAdminMock({
      txn: BASE_TXN, finalizeRpcErr: 'wallet_transfer: no wallet for receiver'
    })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '10000', currency: 'XAF' })

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(admin.rpc).toHaveBeenCalledTimes(1)
  })

  // ─── Happy path (scenarios 1 & 16) ─────────────────────────────────────────

  it('verified successful payment — calls finalize with correct params', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN, finalizeResult: 'completed_and_credited' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({
      status: 'SUCCESSFUL', amount: '10000', currency: 'XAF',
      financialTransactionId: 'mtn-fin-ref-001',
    })

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(vi.mocked(mtnGetPaymentStatus)).toHaveBeenCalledWith(TXN_ID)
    expect(admin.rpc).toHaveBeenCalledWith('finalize_payment_webhook', {
      p_txn_id:         TXN_ID,
      p_new_status:     'completed',
      p_current_status: BASE_TXN.status,
      p_provider_ref:   'mtn-fin-ref-001',
      p_failure_reason: null,
      p_desc:           'Top-up via MTN MoMo (webhook)',
    })
  })

  it('escrow payment — finalize called with completed; result completed_and_escrow_funded', async () => {
    const txnWithEscrow = { ...BASE_TXN, escrow_id: 'escrow-uuid-123' }
    const admin = buildAdminMock({ txn: txnWithEscrow, finalizeResult: 'completed_and_escrow_funded' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '10000', currency: 'XAF' })

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(admin.rpc).toHaveBeenCalledWith('finalize_payment_webhook',
      expect.objectContaining({ p_new_status: 'completed' }))
  })

  it('escrow already settled — finalize completes without error', async () => {
    const txnWithEscrow = { ...BASE_TXN, escrow_id: 'escrow-uuid-123' }
    const admin = buildAdminMock({ txn: txnWithEscrow, finalizeResult: 'completed_escrow_already_settled' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetPaymentStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '10000', currency: 'XAF' })

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
  })

  it('unknown referenceId returns 200 without any API or RPC call', async () => {
    const admin = buildAdminMock({ txn: null, payout: null })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const res = await POST(makeRequest({ referenceId: TXN_ID }))

    expect(res.status).toBe(200)
    expect(vi.mocked(mtnGetPaymentStatus)).not.toHaveBeenCalled()
    expect(vi.mocked(mtnGetTransferStatus)).not.toHaveBeenCalled()
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  // ─── Payout path (disbursements) ────────────────────────────────────────────

  it('[payout] SUCCESSFUL — marks payout completed via CAS update; no reverse call', async () => {
    const admin = buildAdminMock({ txn: null, payout: BASE_PAYOUT, payoutCasHit: true })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetTransferStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '48500', currency: 'XAF' })

    const res = await POST(makeRequest({ referenceId: PAYOUT_ID }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
    expect(admin.from).toHaveBeenCalledWith('payouts')
  })

  it('[payout] SUCCESSFUL CAS miss — returns 200 without duplicate completion', async () => {
    // Another concurrent delivery already marked payout completed.
    const admin = buildAdminMock({ txn: null, payout: BASE_PAYOUT, payoutCasHit: false })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetTransferStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '48500', currency: 'XAF' })

    const res = await POST(makeRequest({ referenceId: PAYOUT_ID }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('[payout] FAILED — reverse_mtn_payout called with correct params', async () => {
    const admin = buildAdminMock({ txn: null, payout: BASE_PAYOUT, reverseResult: 'reversed' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetTransferStatus).mockResolvedValue({
      status: 'FAILED', amount: '48500', currency: 'XAF',
      reason: { code: 'PAYEE_REJECTED', message: 'Insufficient funds at recipient' },
    })

    await POST(makeRequest({ referenceId: PAYOUT_ID }))

    expect(admin.rpc).toHaveBeenCalledWith('reverse_mtn_payout', {
      p_payout_id:      PAYOUT_ID,
      p_current_status: BASE_PAYOUT.status,
      p_failure_reason: 'Insufficient funds at recipient',
    })
  })

  it('[payout] FAILED — already_terminal prevents duplicate reversal (scenario 2)', async () => {
    // Simulates concurrent webhook deliveries: reverse was already called.
    const admin = buildAdminMock({ txn: null, payout: BASE_PAYOUT, reverseResult: 'already_terminal' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetTransferStatus).mockResolvedValue({ status: 'FAILED', amount: '48500', currency: 'XAF' })

    const res = await POST(makeRequest({ referenceId: PAYOUT_ID }))

    expect(res.status).toBe(200)
    expect(admin.rpc).toHaveBeenCalledTimes(1)
  })

  it('[payout] FAILED — forged SUCCESSFUL: provider confirms FAILED — reversal triggered', async () => {
    const admin = buildAdminMock({ txn: null, payout: BASE_PAYOUT, reverseResult: 'reversed' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetTransferStatus).mockResolvedValue({ status: 'FAILED', amount: '48500', currency: 'XAF' })

    await POST(makeRequest({ referenceId: PAYOUT_ID, status: 'SUCCESSFUL' }))

    expect(admin.rpc).toHaveBeenCalledWith('reverse_mtn_payout', expect.any(Object))
  })

  it('[payout] FAILED — reverse RPC error — returns 200 (does not retry)', async () => {
    // Simulates: DB error inside reverse_mtn_payout — entire DB transaction rolled
    // back; payout stays in pre-call state for the next provider retry.
    const admin = buildAdminMock({
      txn: null, payout: BASE_PAYOUT, reverseRpcErr: 'wallet_transfer: no wallet for receiver'
    })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetTransferStatus).mockResolvedValue({ status: 'FAILED', amount: '48500', currency: 'XAF' })

    const res = await POST(makeRequest({ referenceId: PAYOUT_ID }))

    expect(res.status).toBe(200)
    expect(admin.rpc).toHaveBeenCalledTimes(1)
  })

  it('[payout] amount mismatch — no reverse call', async () => {
    const admin = buildAdminMock({ txn: null, payout: BASE_PAYOUT })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(mtnGetTransferStatus).mockResolvedValue({ status: 'SUCCESSFUL', amount: '99999', currency: 'XAF' })

    await POST(makeRequest({ referenceId: PAYOUT_ID }))

    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('[payout] terminal payout — no provider call', async () => {
    const admin = buildAdminMock({ txn: null, payout: { ...BASE_PAYOUT, status: 'completed' } })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const res = await POST(makeRequest({ referenceId: PAYOUT_ID }))

    expect(res.status).toBe(200)
    expect(vi.mocked(mtnGetTransferStatus)).not.toHaveBeenCalled()
    expect(admin.rpc).not.toHaveBeenCalled()
  })
})
