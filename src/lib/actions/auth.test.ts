import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache',      () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/headers',    () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock('@/lib/supabase/admin',  () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/utils/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ limited: false }),
}))

import { createClient }     from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  signIn,
  signOut,
  adminAssignRole,
  adminSuspendAccount,
  adminActivateAccount,
  adminApproveProfessional,
} from './auth'

const TARGET_ID = 'a0eebc99-9c0b-4ef8-bb6d-400000000001'
const KYC_ID    = 'a0eebc99-9c0b-4ef8-bb6d-400000000002'

// ─── Mock builders ──────────────────────────────────────────────────────────

function makeSignInClient(opts: {
  signInError?: string | null
  userExists?: boolean
  profile?: { role: string; onboarding_completed: boolean; account_status: string } | null
}) {
  const profile = opts.profile ?? { role: 'buyer', onboarding_completed: true, account_status: 'active' }
  const chain: any = { select: vi.fn(), eq: vi.fn(), single: vi.fn() }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.single.mockResolvedValue({ data: profile })

  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        error: opts.signInError ? { message: opts.signInError } : null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.userExists === false ? null : { id: 'user-1' } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({}),
    },
    from: vi.fn(() => chain),
  }
}

function makeCallerRoleClient(callerRole: string | null, targetRole?: string | null) {
  let callCount = 0
  const profileChain: any = { select: vi.fn(), eq: vi.fn(), single: vi.fn() }
  profileChain.select.mockReturnValue(profileChain)
  profileChain.eq.mockReturnValue(profileChain)
  profileChain.single.mockImplementation(() => {
    callCount++
    const role = callCount === 1 ? callerRole : (targetRole ?? 'buyer')
    return Promise.resolve({ data: role ? { role } : null, error: null })
  })

  const logChain: any = { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: callerRole ? { id: 'u1' } : null }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'admin_logs' || table === 'account_notices' || table === 'notifications') {
        return logChain
      }
      return profileChain
    }),
  }
}

function makeAdminChain() {
  // Generic fluent chain that resolves with success on terminal calls
  function makeChain(singleData: any = null) {
    const terminal = Promise.resolve({ data: null, error: null })
    const c: any = {}
    c.select = vi.fn(() => c)
    c.eq     = vi.fn(() => c)
    c.in     = vi.fn(() => c)
    c.update = vi.fn(() => c)
    c.insert = vi.fn().mockResolvedValue({ data: null, error: null })
    c.single = vi.fn().mockResolvedValue({ data: singleData, error: null })
    c.then   = terminal.then.bind(terminal)
    c.catch  = terminal.catch.bind(terminal)
    return c
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'kyc_records') return makeChain({ id: KYC_ID })
      // profiles: return a role for the target so approval proceeds
      if (table === 'profiles') return makeChain({ role: 'contractor' })
      return makeChain()
    }),
  }
}

// ─── signIn ─────────────────────────────────────────────────────────────────

describe('signIn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error for invalid email', async () => {
    const res = await signIn({ email: 'not-an-email', password: 'Password123!' })
    expect(res.error).toBeTruthy()
    expect(vi.mocked(createClient)).not.toHaveBeenCalled()
  })

  it('returns error for empty password', async () => {
    const res = await signIn({ email: 'user@test.com', password: '' })
    expect(res.error).toBeTruthy()
    expect(vi.mocked(createClient)).not.toHaveBeenCalled()
  })

  it('returns neutral message for bad credentials', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSignInClient({ signInError: 'Invalid login credentials' }) as any
    )
    const res = await signIn({ email: 'user@test.com', password: 'WrongPass1!' })
    expect(res.error).toMatch(/Invalid email or password/i)
  })

  it('returns error if email not confirmed', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSignInClient({ signInError: 'Email not confirmed' }) as any
    )
    const res = await signIn({ email: 'user@test.com', password: 'Password1!' })
    expect(res.error).toMatch(/verify your email/i)
  })

  it('blocks suspended accounts and signs out', async () => {
    const mock = makeSignInClient({
      profile: { role: 'buyer', onboarding_completed: true, account_status: 'suspended' },
    })
    vi.mocked(createClient).mockResolvedValue(mock as any)
    const res = await signIn({ email: 'bad@test.com', password: 'Password1!' })
    expect(res.error).toMatch(/suspended/i)
    expect(mock.auth.signOut).toHaveBeenCalled()
  })

  it('redirects to onboarding when not completed', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSignInClient({
        profile: { role: 'buyer', onboarding_completed: false, account_status: 'active' },
      }) as any
    )
    const res = await signIn({ email: 'user@test.com', password: 'Password1!' })
    expect(res.success).toBe(true)
    expect((res as any).data?.redirectTo).toBe('/onboarding')
  })

  it('happy path: returns success with redirect', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSignInClient({}) as any)
    const res = await signIn({ email: 'user@test.com', password: 'Password1!' })
    expect(res.success).toBe(true)
    expect((res as any).data?.redirectTo).toBeTruthy()
  })
})

// ─── signOut ─────────────────────────────────────────────────────────────────

describe('signOut', () => {
  it('calls supabase.auth.signOut without throwing', async () => {
    const signOutMock = vi.fn().mockResolvedValue({})
    vi.mocked(createClient).mockResolvedValue({
      auth: { signOut: signOutMock },
    } as any)
    await signOut()
    expect(signOutMock).toHaveBeenCalled()
  })
})

// ─── adminAssignRole ─────────────────────────────────────────────────────────

describe('adminAssignRole', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects unauthenticated callers', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient(null) as any)
    const res = await adminAssignRole(TARGET_ID, 'seller')
    expect(res.error).toBe('Not authenticated.')
  })

  it('rejects non-privileged users', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient('buyer') as any)
    const res = await adminAssignRole(TARGET_ID, 'seller')
    expect(res.error).toBe('Insufficient permissions.')
  })

  it('prevents moderator from assigning admin role', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient('moderator') as any)
    const res = await adminAssignRole(TARGET_ID, 'admin')
    expect(res.error).toBe('Moderators cannot assign the admin role.')
  })

  it('prevents moderator from modifying an admin account', async () => {
    // First call = caller is moderator, second call = target is admin
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient('moderator', 'admin') as any)
    const res = await adminAssignRole(TARGET_ID, 'seller')
    expect(res.error).toBe('Moderators cannot modify administrator accounts.')
  })

  it('allows admin to assign any role', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient('admin') as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminChain() as any)
    const res = await adminAssignRole(TARGET_ID, 'seller')
    expect(res).toEqual({ success: true })
  })

  it('allows moderator to assign non-admin role to non-admin target', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient('moderator', 'buyer') as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminChain() as any)
    const res = await adminAssignRole(TARGET_ID, 'seller')
    expect(res).toEqual({ success: true })
  })
})

// ─── adminSuspendAccount ─────────────────────────────────────────────────────

describe('adminSuspendAccount', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects unauthenticated callers', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient(null) as any)
    const res = await adminSuspendAccount(TARGET_ID, 'Violation')
    expect(res.error).toBe('Not authenticated.')
  })

  it('rejects non-privileged users', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient('seller') as any)
    const res = await adminSuspendAccount(TARGET_ID, 'Spam')
    expect(res.error).toBe('Insufficient permissions.')
  })

  it('prevents moderator from suspending an admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient('moderator', 'admin') as any)
    const res = await adminSuspendAccount(TARGET_ID, 'Test')
    expect(res.error).toBe('Moderators cannot suspend administrator accounts.')
  })

  it('allows admin to suspend any account', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient('admin') as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminChain() as any)
    const res = await adminSuspendAccount(TARGET_ID, 'Policy violation')
    expect(res).toEqual({ success: true })
  })

  it('allows moderator to suspend a regular user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient('moderator', 'buyer') as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminChain() as any)
    const res = await adminSuspendAccount(TARGET_ID, 'Spam')
    expect(res).toEqual({ success: true })
  })
})

// ─── adminActivateAccount ────────────────────────────────────────────────────

describe('adminActivateAccount', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects unauthenticated callers', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient(null) as any)
    const res = await adminActivateAccount(TARGET_ID)
    expect(res.error).toBe('Not authenticated.')
  })

  it('rejects non-privileged users', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient('agent') as any)
    const res = await adminActivateAccount(TARGET_ID)
    expect(res.error).toBe('Insufficient permissions.')
  })

  it('allows admin to activate any account', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient('admin') as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminChain() as any)
    const res = await adminActivateAccount(TARGET_ID)
    expect(res).toEqual({ success: true })
  })

  it('allows moderator to activate a non-admin account', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient('moderator', 'seller') as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminChain() as any)
    const res = await adminActivateAccount(TARGET_ID)
    expect(res).toEqual({ success: true })
  })
})

// ─── adminApproveProfessional ────────────────────────────────────────────────

describe('adminApproveProfessional', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects non-admin callers (moderator not enough)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient('moderator') as any)
    const res = await adminApproveProfessional(TARGET_ID, KYC_ID)
    expect(res.error).toBe('Insufficient permissions.')
  })

  it('rejects unauthenticated callers', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient(null) as any)
    const res = await adminApproveProfessional(TARGET_ID, KYC_ID)
    expect(res.error).toBe('Not authenticated.')
  })

  it('allows admin to approve a professional', async () => {
    vi.mocked(createClient).mockResolvedValue(makeCallerRoleClient('admin') as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminChain() as any)
    const res = await adminApproveProfessional(TARGET_ID, KYC_ID)
    expect(res).toEqual({ success: true })
  })
})
