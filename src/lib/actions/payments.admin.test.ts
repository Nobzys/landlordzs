import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rejectPayoutAdmin, markPayoutPaidAdmin } from './payments'

const PAYOUT_ID   = 'pppppppp-0000-1111-2222-333333333333'
const RECIPIENT   = 'rrrrrrrr-0000-1111-2222-444444444444'
const LOCKED_AMT  = 50000

function makeSupabaseMock(role: string | null) {
  const selectChain: any = { from: vi.fn(), select: vi.fn(), eq: vi.fn() }
  selectChain.select.mockReturnValue(selectChain)
  selectChain.eq.mockReturnValue(selectChain)
  selectChain.single = vi.fn(() => Promise.resolve({ data: role ? { role } : null, error: null }))

  const from = vi.fn((table: string) => {
    if (table === 'profiles') return selectChain
    return selectChain
  })

  return {
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } }, error: null })) },
    from,
  }
}

function makeAdminMock(rejectedRow: unknown = { id: PAYOUT_ID }) {
  const rpc = vi.fn(() => Promise.resolve({ error: null }))
  const terminal = Promise.resolve({ data: rejectedRow, error: null })
  const chain: any = {}
  chain.from   = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.eq     = vi.fn(() => chain)
  chain.select = vi.fn(() => chain)
  chain.single = vi.fn(() => terminal)
  chain.then   = terminal.then.bind(terminal)
  chain.catch  = terminal.catch.bind(terminal)
  return { from: chain.from, rpc }
}

function makeFd(entries: Record<string, string> = {}): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

describe('rejectPayoutAdmin — F2 authorization', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns Unauthorized when no session', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: new Error('no session') })) },
      from: vi.fn(),
    } as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminMock() as any)

    const res = await rejectPayoutAdmin(PAYOUT_ID, RECIPIENT, LOCKED_AMT, makeFd())
    expect(res).toEqual({ error: 'Unauthorized' })
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled()
  })

  it('returns Insufficient permissions for a moderator caller', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('moderator') as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminMock() as any)

    const res = await rejectPayoutAdmin(PAYOUT_ID, RECIPIENT, LOCKED_AMT, makeFd())
    expect(res).toEqual({ error: 'Insufficient permissions' })
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled()
  })

  it('returns Insufficient permissions for a regular user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('tenant') as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminMock() as any)

    const res = await rejectPayoutAdmin(PAYOUT_ID, RECIPIENT, LOCKED_AMT, makeFd())
    expect(res).toEqual({ error: 'Insufficient permissions' })
  })

  it('succeeds for an admin caller — updates payout and releases wallet lock', async () => {
    const adminMock = makeAdminMock({ id: PAYOUT_ID })
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('admin') as any)
    vi.mocked(createAdminClient).mockReturnValue(adminMock as any)

    const res = await rejectPayoutAdmin(PAYOUT_ID, RECIPIENT, LOCKED_AMT, makeFd({ reason: 'Docs missing' }))
    expect(res).toEqual({ success: true })
    expect(adminMock.rpc).toHaveBeenCalledWith('wallet_unlock', {
      p_user_id: RECIPIENT,
      p_amount:  LOCKED_AMT,
    })
  })

  it('uses default reason when form field is empty', async () => {
    const adminMock = makeAdminMock({ id: PAYOUT_ID })
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('admin') as any)
    vi.mocked(createAdminClient).mockReturnValue(adminMock as any)

    const res = await rejectPayoutAdmin(PAYOUT_ID, RECIPIENT, LOCKED_AMT, makeFd())
    expect(res).toEqual({ success: true })
  })
})

describe('markPayoutPaidAdmin — F2 authorization', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns Unauthorized when no session', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: new Error('no session') })) },
      from: vi.fn(),
    } as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminMock() as any)

    const res = await markPayoutPaidAdmin(PAYOUT_ID)
    expect(res).toEqual({ error: 'Unauthorized' })
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled()
  })

  it('returns Insufficient permissions for a moderator', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('moderator') as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminMock() as any)

    const res = await markPayoutPaidAdmin(PAYOUT_ID)
    expect(res).toEqual({ error: 'Insufficient permissions' })
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled()
  })

  it('succeeds for an admin caller', async () => {
    const adminMock = makeAdminMock()
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('admin') as any)
    vi.mocked(createAdminClient).mockReturnValue(adminMock as any)

    const res = await markPayoutPaidAdmin(PAYOUT_ID)
    expect(res).toEqual({ success: true })
  })
})
