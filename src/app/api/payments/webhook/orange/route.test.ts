import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json:   () => Promise.resolve(body),
    }),
  },
}))

vi.mock('@/lib/supabase/admin',      () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/utils/orange-money',  () => ({ orangeGetPaymentStatus: vi.fn() }))

import { createAdminClient }      from '@/lib/supabase/admin'
import { orangeGetPaymentStatus } from '@/lib/utils/orange-money'
import { POST }                   from './route'

const ORDER_ID    = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const NOTIF_TOKEN = 'secure-notif-token-12345'
const PAY_TOKEN   = 'pay-token-67890'

function makeRequest(body: object): Request {
  return new Request('http://localhost/api/payments/webhook/orange', {
    method:  'POST',
    body:    JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeSelectChain(data: unknown) {
  const c: any = { select: () => c, eq: () => c }
  const terminal = Promise.resolve({ data, error: null })
  c.single = () => terminal
  c.then   = terminal.then.bind(terminal)
  c.catch  = terminal.catch.bind(terminal)
  return c
}

// Build admin client mock.
// New handler: from('transactions') SELECT (once only), rpc('finalize_payment_webhook').
// No second from('transactions') UPDATE — CAS is inside the RPC.
// No from('escrow_accounts') — escrow update is inside the RPC.
function buildAdminMock({
  txn            = null as Record<string, unknown> | null,
  finalizeResult = 'completed_and_credited' as string | null,
  finalizeRpcErr = null as string | null,
}: {
  txn?:            Record<string, unknown> | null
  finalizeResult?: string | null
  finalizeRpcErr?: string | null
} = {}) {
  const rpc = vi.fn((name: string) => {
    if (name === 'finalize_payment_webhook') {
      return Promise.resolve({
        data:  finalizeRpcErr ? null : finalizeResult,
        error: finalizeRpcErr ? { message: finalizeRpcErr } : null,
      })
    }
    return Promise.resolve({ data: null, error: null })
  })

  const from = vi.fn((_table: string) => makeSelectChain(txn))

  return { from, rpc }
}

const BASE_TXN = {
  id:            ORDER_ID,
  status:        'processing',
  amount:        10000,
  provider_meta: { notif_token: NOTIF_TOKEN, pay_token: PAY_TOKEN, order_id: ORDER_ID },
}

describe('Orange Money webhook — financial integrity', () => {
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

  it('returns 400 when order_id is missing', async () => {
    const res = await POST(makeRequest({ status: 'SUCCESS', notif_token: NOTIF_TOKEN }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.stringMatching(/order_id|notif_token/i) })
  })

  it('returns 400 when notif_token is missing', async () => {
    const res = await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when order_id is not a valid UUID', async () => {
    const res = await POST(makeRequest({
      status:      'SUCCESS',
      order_id:    'not-a-uuid',
      notif_token: NOTIF_TOKEN,
    }))
    expect(res.status).toBe(400)
  })

  // ─── Authentication ─────────────────────────────────────────────────────────

  it('returns 401 when notif_token does not match stored token', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const res = await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID, notif_token: 'wrong-token' }))

    expect(res.status).toBe(401)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('returns 401 when provider_meta is empty (stored token absent)', async () => {
    const admin = buildAdminMock({ txn: { ...BASE_TXN, provider_meta: {} } })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const res = await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(401)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('returns 401 when provider_meta is null', async () => {
    const admin = buildAdminMock({ txn: { ...BASE_TXN, provider_meta: null } })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const res = await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(401)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  // ─── Unknown order ──────────────────────────────────────────────────────────

  it('returns 200 for unknown order_id without any provider call', async () => {
    const admin = buildAdminMock({ txn: null })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const res = await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(vi.mocked(orangeGetPaymentStatus)).not.toHaveBeenCalled()
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  // ─── Idempotency ────────────────────────────────────────────────────────────

  it('is idempotent — duplicate callback for a completed transaction is a no-op', async () => {
    const admin = buildAdminMock({ txn: { ...BASE_TXN, status: 'completed' } })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const res = await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(vi.mocked(orangeGetPaymentStatus)).not.toHaveBeenCalled()
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('is idempotent — repeated failed callback is a no-op', async () => {
    const admin = buildAdminMock({ txn: { ...BASE_TXN, status: 'failed' } })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const res = await POST(makeRequest({ status: 'FAILED', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  // ─── Still in-flight ────────────────────────────────────────────────────────

  it('returns 200 without side-effects for PENDING status', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const res = await POST(makeRequest({ status: 'PENDING', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(vi.mocked(orangeGetPaymentStatus)).not.toHaveBeenCalled()
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('returns 200 without side-effects for INITIATED status', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const res = await POST(makeRequest({ status: 'INITIATED', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('returns 200 for an unrecognized provider status without side-effects', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'MYSTERY_UNKNOWN' } as any)

    const res = await POST(makeRequest({ status: 'MYSTERY', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(vi.mocked(orangeGetPaymentStatus)).toHaveBeenCalledWith(ORDER_ID, PAY_TOKEN)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  // ─── Provider verification ──────────────────────────────────────────────────

  it('FAILED callback calls provider API before committing state', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN, finalizeResult: 'failed' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'FAILED' })

    await POST(makeRequest({ status: 'FAILED', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(vi.mocked(orangeGetPaymentStatus)).toHaveBeenCalledWith(ORDER_ID, PAY_TOKEN)
  })

  it('CANCELLED callback calls provider API before committing state', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN, finalizeResult: 'failed' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'CANCELLED' })

    await POST(makeRequest({ status: 'CANCELLED', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(vi.mocked(orangeGetPaymentStatus)).toHaveBeenCalledWith(ORDER_ID, PAY_TOKEN)
  })

  it('returns 200 without calling finalize when provider API is unavailable', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockRejectedValue(new Error('fetch failed'))

    const res = await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  // ─── Security: forged callbacks ─────────────────────────────────────────────

  it('[F1] forged SUCCESS — provider confirms FAILED — finalize called with p_new_status: failed', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN, finalizeResult: 'failed' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'FAILED' })

    const res = await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(vi.mocked(orangeGetPaymentStatus)).toHaveBeenCalledWith(ORDER_ID, PAY_TOKEN)
    expect(admin.rpc).toHaveBeenCalledWith('finalize_payment_webhook',
      expect.objectContaining({ p_new_status: 'failed' }))
  })

  it('[F1] forged SUCCESS — provider confirms PENDING — no finalize call', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'PENDING' })

    const res = await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('forged FAILED — provider confirms SUCCESS — finalize called with p_new_status: completed', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN, finalizeResult: 'completed_and_credited' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'SUCCESS' })

    const res = await POST(makeRequest({ status: 'FAILED', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(vi.mocked(orangeGetPaymentStatus)).toHaveBeenCalledWith(ORDER_ID, PAY_TOKEN)
    expect(admin.rpc).toHaveBeenCalledWith('finalize_payment_webhook',
      expect.objectContaining({ p_new_status: 'completed' }))
  })

  it('forged FAILED — provider confirms PENDING — no state change', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'PENDING' })

    const res = await POST(makeRequest({ status: 'FAILED', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('forged CANCELLED — provider API unavailable — no state change', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockRejectedValue(new Error('timeout'))

    const res = await POST(makeRequest({ status: 'CANCELLED', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  // ─── Amount verification ─────────────────────────────────────────────────────

  it('amount mismatch — provider confirms SUCCESS with wrong amount — no finalize call', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'SUCCESS', amount: 9999 })

    const res = await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('provider omits amount — processes normally', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN, finalizeResult: 'completed_and_credited' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'SUCCESS' })

    const res = await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(admin.rpc).toHaveBeenCalledTimes(1)
  })

  // ─── Happy path (scenarios 1 & 16) ─────────────────────────────────────────

  it('verified successful payment — calls finalize with correct params', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN, finalizeResult: 'completed_and_credited' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'SUCCESS' })

    const res = await POST(makeRequest({
      status:      'SUCCESS',
      order_id:    ORDER_ID,
      notif_token: NOTIF_TOKEN,
      txnid:       'om-txn-ref-001',
    }))

    expect(res.status).toBe(200)
    expect(vi.mocked(orangeGetPaymentStatus)).toHaveBeenCalledWith(ORDER_ID, PAY_TOKEN)
    expect(admin.rpc).toHaveBeenCalledWith('finalize_payment_webhook', {
      p_txn_id:         ORDER_ID,
      p_new_status:     'completed',
      p_current_status: BASE_TXN.status,
      p_provider_ref:   'om-txn-ref-001',
      p_failure_reason: null,
      p_desc:           'Top-up via Orange Money (webhook)',
    })
  })

  it('uses order_id as provider_ref when txnid is absent', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN, finalizeResult: 'completed_and_credited' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'SUCCESS' })

    await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(admin.rpc).toHaveBeenCalledWith('finalize_payment_webhook',
      expect.objectContaining({ p_provider_ref: ORDER_ID }))
  })

  it('FAILED callback — passes p_failure_reason from the callback status field', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN, finalizeResult: 'failed' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'FAILED' })

    await POST(makeRequest({ status: 'FAILED', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(admin.rpc).toHaveBeenCalledWith('finalize_payment_webhook',
      expect.objectContaining({
        p_new_status:     'failed',
        p_failure_reason: 'FAILED',
      }))
  })

  it('CANCELLED callback — passes p_failure_reason as CANCELLED', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN, finalizeResult: 'failed' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'CANCELLED' })

    await POST(makeRequest({ status: 'CANCELLED', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(admin.rpc).toHaveBeenCalledWith('finalize_payment_webhook',
      expect.objectContaining({
        p_new_status:     'failed',
        p_failure_reason: 'CANCELLED',
      }))
  })

  // ─── Atomicity and concurrency (scenarios 3 & 6) ───────────────────────────

  it('finalize returns already_terminal — returns 200 without duplicate credit', async () => {
    // Simulates: provider verifies SUCCESS but concurrent delivery already completed.
    const admin = buildAdminMock({ txn: BASE_TXN, finalizeResult: 'already_terminal' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'SUCCESS' })

    const res = await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(admin.rpc).toHaveBeenCalledTimes(1)
  })

  it('finalize returns cas_missed — returns 200 without duplicate credit', async () => {
    const admin = buildAdminMock({ txn: BASE_TXN, finalizeResult: 'cas_missed' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'SUCCESS' })

    const res = await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(admin.rpc).toHaveBeenCalledTimes(1)
  })

  // ─── RPC failure (scenarios 4 & 5) ─────────────────────────────────────────

  it('finalize RPC error — returns 200 (transaction stays in pre-call state; provider retries)', async () => {
    // Simulates: DB error inside finalize_payment_webhook — entire DB transaction
    // rolled back; transaction stays processing for the next provider retry.
    const admin = buildAdminMock({ txn: BASE_TXN, finalizeRpcErr: 'wallet_transfer: no wallet for receiver' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'SUCCESS' })

    const res = await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(admin.rpc).toHaveBeenCalledTimes(1) // attempted once; NOT retried
  })

  // ─── Escrow path ────────────────────────────────────────────────────────────

  it('escrow payment: finalize called with completed; result completed_and_escrow_funded', async () => {
    const txnWithEscrow = { ...BASE_TXN, escrow_id: 'escrow-uuid-123' }
    const admin = buildAdminMock({ txn: txnWithEscrow, finalizeResult: 'completed_and_escrow_funded' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'SUCCESS' })

    const res = await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(admin.rpc).toHaveBeenCalledWith('finalize_payment_webhook',
      expect.objectContaining({ p_new_status: 'completed' }))
  })

  it('escrow already settled — finalize returns completed_escrow_already_settled — returns 200', async () => {
    const txnWithEscrow = { ...BASE_TXN, escrow_id: 'escrow-uuid-123' }
    const admin = buildAdminMock({ txn: txnWithEscrow, finalizeResult: 'completed_escrow_already_settled' })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)
    vi.mocked(orangeGetPaymentStatus).mockResolvedValue({ status: 'SUCCESS' })

    const res = await POST(makeRequest({ status: 'SUCCESS', order_id: ORDER_ID, notif_token: NOTIF_TOKEN }))

    expect(res.status).toBe(200)
    expect(admin.rpc).toHaveBeenCalledTimes(1)
  })
})
