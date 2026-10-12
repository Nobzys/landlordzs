import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/headers', () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { suspendProfessionalAdmin, reactivateProfessionalAdmin, banProfessionalAdmin } from './auth'

const USER_ID = 'target-user-0000-0000-0000000000001'

function makeSupabaseMock(role: string | null, noUser = false) {
  const chain: any = { select: vi.fn(), eq: vi.fn() }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.single = vi.fn(() => Promise.resolve({ data: role ? { role } : null, error: null }))
  return {
    auth: {
      getUser: vi.fn(() =>
        noUser
          ? Promise.resolve({ data: { user: null }, error: new Error('no session') })
          : Promise.resolve({ data: { user: { id: 'caller-1' } }, error: null }),
      ),
    },
    from: vi.fn(() => chain),
  }
}

function makeAdminMock() {
  const terminal = Promise.resolve({ data: null, error: null })
  const chain: any = {}
  chain.from   = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.eq     = vi.fn(() => chain)
  chain.then   = terminal.then.bind(terminal)
  chain.catch  = terminal.catch.bind(terminal)
  return chain
}

// ─── suspendProfessionalAdmin ────────────────────────────────────────────────

describe('suspendProfessionalAdmin — F2 authorization', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('rejects unauthenticated callers', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null, true) as any)
    const res = await suspendProfessionalAdmin(USER_ID)
    expect(res).toEqual({ error: 'Unauthorized' })
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled()
  })

  it('rejects a regular user (e.g. tenant)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('tenant') as any)
    const res = await suspendProfessionalAdmin(USER_ID)
    expect(res).toEqual({ error: 'Insufficient permissions' })
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled()
  })

  it('allows moderator to suspend', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('moderator') as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminMock() as any)
    const res = await suspendProfessionalAdmin(USER_ID)
    expect(res).toEqual({ success: true })
    expect(vi.mocked(createAdminClient)).toHaveBeenCalled()
  })

  it('allows admin to suspend', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('admin') as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminMock() as any)
    const res = await suspendProfessionalAdmin(USER_ID)
    expect(res).toEqual({ success: true })
  })
})

// ─── reactivateProfessionalAdmin ─────────────────────────────────────────────

describe('reactivateProfessionalAdmin — F2 authorization', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('rejects unauthenticated callers', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null, true) as any)
    const res = await reactivateProfessionalAdmin(USER_ID)
    expect(res).toEqual({ error: 'Unauthorized' })
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled()
  })

  it('rejects a non-privileged user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('professional') as any)
    const res = await reactivateProfessionalAdmin(USER_ID)
    expect(res).toEqual({ error: 'Insufficient permissions' })
  })

  it('allows moderator to reactivate', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('moderator') as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminMock() as any)
    const res = await reactivateProfessionalAdmin(USER_ID)
    expect(res).toEqual({ success: true })
  })

  it('allows admin to reactivate', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('admin') as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminMock() as any)
    const res = await reactivateProfessionalAdmin(USER_ID)
    expect(res).toEqual({ success: true })
  })
})

// ─── banProfessionalAdmin ────────────────────────────────────────────────────

describe('banProfessionalAdmin — F2 authorization', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('rejects unauthenticated callers', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null, true) as any)
    const res = await banProfessionalAdmin(USER_ID)
    expect(res).toEqual({ error: 'Unauthorized' })
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled()
  })

  it('rejects moderator callers — ban is admin-only', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('moderator') as any)
    const res = await banProfessionalAdmin(USER_ID)
    expect(res).toEqual({ error: 'Insufficient permissions' })
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled()
  })

  it('rejects regular user callers', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('agent') as any)
    const res = await banProfessionalAdmin(USER_ID)
    expect(res).toEqual({ error: 'Insufficient permissions' })
  })

  it('allows admin to permanently ban', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('admin') as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminMock() as any)
    const res = await banProfessionalAdmin(USER_ID)
    expect(res).toEqual({ success: true })
    expect(vi.mocked(createAdminClient)).toHaveBeenCalled()
  })
})
