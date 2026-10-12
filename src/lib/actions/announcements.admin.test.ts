import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updatePlatformSettingAdmin } from './announcements'

const SETTING_KEY = 'platform_fee_percent'

function makeSupabaseMock(role: string | null, noUser = false) {
  const chain: any = { select: vi.fn(), eq: vi.fn() }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.single = vi.fn(() => Promise.resolve({ data: role ? { role } : null, error: null }))
  return {
    auth: {
      getUser: vi.fn(() =>
        noUser
          ? Promise.resolve({ data: { user: null }, error: null })
          : Promise.resolve({ data: { user: { id: 'u1' } }, error: null }),
      ),
    },
    from: vi.fn(() => chain),
  }
}

function makeAdminMock(dbError: string | null = null) {
  const result = dbError
    ? { data: null, error: { message: dbError } }
    : { data: null, error: null }
  const terminal = Promise.resolve(result)
  const chain: any = {}
  chain.from   = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.eq     = vi.fn(() => chain)
  chain.then   = terminal.then.bind(terminal)
  chain.catch  = terminal.catch.bind(terminal)
  return { from: chain.from }
}

function makeFd(entries: Record<string, string> = {}): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

describe('updatePlatformSettingAdmin — F2 authorization', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('rejects unauthenticated callers', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null, true) as any)

    const res = await updatePlatformSettingAdmin(SETTING_KEY, makeFd({ value: '10' }))

    expect(res).toEqual({ error: 'Not authenticated.' })
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled()
  })

  it('rejects moderator callers — update platform settings is admin-only', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('moderator') as any)

    const res = await updatePlatformSettingAdmin(SETTING_KEY, makeFd({ value: '10' }))

    expect(res).toEqual({ error: 'Insufficient permissions.' })
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled()
  })

  it('rejects non-privileged callers (e.g. professional)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('professional') as any)

    const res = await updatePlatformSettingAdmin(SETTING_KEY, makeFd({ value: '10' }))

    expect(res).toEqual({ error: 'Insufficient permissions.' })
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled()
  })

  it('allows admin to update a setting and uses the privileged client', async () => {
    const adminMock = makeAdminMock()
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('admin') as any)
    vi.mocked(createAdminClient).mockReturnValue(adminMock as any)

    const res = await updatePlatformSettingAdmin(SETTING_KEY, makeFd({ value: '12' }))

    expect(res).toEqual({ success: true })
    expect(vi.mocked(createAdminClient)).toHaveBeenCalled()
  })

  it('returns an error when the value field is absent — createAdminClient not called', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('admin') as any)

    const res = await updatePlatformSettingAdmin(SETTING_KEY, makeFd())

    expect(res).toEqual({ error: 'Value is required.' })
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled()
  })

  it('surfaces a database error returned by Supabase', async () => {
    const adminMock = makeAdminMock('constraint violation')
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock('admin') as any)
    vi.mocked(createAdminClient).mockReturnValue(adminMock as any)

    const res = await updatePlatformSettingAdmin(SETTING_KEY, makeFd({ value: '99' }))

    expect(res).toEqual({ error: 'constraint violation' })
  })
})
