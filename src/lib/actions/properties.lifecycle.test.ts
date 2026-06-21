import { describe, it, expect, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { publishProperty, deleteProperty, requestVerification, reviewVerification, adminRestoreToDraft } from './properties'

const mockUser = { id: 'user-1' }

// Minimal chainable query-builder mock: every method returns `this` until a
// terminal method (single/maybeSingle, or awaiting the builder itself for
// .update()/.delete() without a final select) resolves to `result`.
function makeChain(result: { data: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.update = vi.fn(self)
  chain.delete = vi.fn(self)
  chain.insert = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.order = vi.fn(self)
  chain.limit = vi.fn(self)
  chain.single = vi.fn(async () => result)
  chain.maybeSingle = vi.fn(async () => result)
  // Allow the chain itself to be awaited (e.g. `.update().eq().eq()` with no .single()).
  chain.then = (resolve: (v: typeof result) => void) => resolve(result)
  return chain
}

function buildFromMock(statusByTable: Record<string, unknown>) {
  return vi.fn((table: string) => {
    if (table === 'properties') return makeChain({ data: statusByTable.properties, error: null })
    // profiles_safe (not the base table) for self-account-status reads —
    // see 20260624000001_profiles_safe_view.sql. Plain 'profiles' is kept
    // too since role-only checks (reviewVerification, adminRestoreToDraft)
    // still read the base table — role is never masked.
    if (table === 'profiles' || table === 'profiles_safe') return makeChain({ data: statusByTable.profiles, error: null })
    if (table === 'property_verifications') return makeChain({ data: statusByTable.property_verifications, error: null })
    if (table === 'admin_logs') return makeChain({ data: null, error: null })
    throw new Error(`Unexpected table queried in test: ${table}`)
  })
}

describe('publishProperty — transition validation', () => {
  it('rejects publishing a draft directly to active', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: mockUser }, error: null }) },
      from: buildFromMock({ properties: { status: 'draft' } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await publishProperty('prop-1', true)
    expect(result.error).toMatch(/Cannot change status/)
  })

  it('allows republishing an off_market listing back to active', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: mockUser }, error: null }) },
      from: buildFromMock({ properties: { status: 'off_market' }, profiles: { account_status: 'active' } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await publishProperty('prop-1', true)
    expect(result.error).toBeUndefined()
    expect(result.success).toBe(true)
  })
})

describe('deleteProperty (soft delete) — transition validation', () => {
  it('rejects deleting an active listing', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: mockUser }, error: null }) },
      from: buildFromMock({ properties: { status: 'active' } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await deleteProperty('prop-1')
    expect(result.error).toMatch(/Cannot delete/)
  })

  it('allows archiving a draft listing', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: mockUser }, error: null }) },
      from: buildFromMock({ properties: { status: 'draft' } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await deleteProperty('prop-1')
    expect(result.error).toBeUndefined()
    expect(result.success).toBe(true)
  })
})

describe('requestVerification — transition validation', () => {
  it('rejects submitting an already-active property for review', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: mockUser }, error: null }) },
      from: buildFromMock({ properties: { status: 'active' } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await requestVerification('prop-1')
    expect(result.error).toMatch(/Cannot submit for review/)
  })

  it('allows submitting a draft property for review', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: mockUser }, error: null }) },
      from: buildFromMock({ properties: { status: 'draft' }, property_verifications: null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await requestVerification('prop-1')
    expect(result.error).toBeUndefined()
    expect(result.success).toBe(true)
  })
})

describe('reviewVerification — transition validation', () => {
  it('rejects approving a verification whose property is no longer pending_review', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: mockUser }, error: null }) },
      from: buildFromMock({ profiles: { role: 'admin' } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'property_verifications') {
          return makeChain({ data: { property_id: 'prop-1', properties: { status: 'active' } }, error: null })
        }
        throw new Error(`Unexpected table queried: ${table}`)
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await reviewVerification('verif-1', 'approved')
    expect(result.error).toMatch(/Cannot change property status/)
  })
})

describe('adminRestoreToDraft — transition validation', () => {
  it('rejects restoring an active property to draft', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: mockUser }, error: null }) },
      from: buildFromMock({ profiles: { role: 'admin' } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    vi.mocked(createAdminClient).mockReturnValue({
      from: buildFromMock({ properties: { status: 'active' } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await adminRestoreToDraft('prop-1')
    expect(result.error).toMatch(/Cannot restore/)
  })

  it('allows restoring a rejected property to draft', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: mockUser }, error: null }) },
      from: buildFromMock({ profiles: { role: 'admin' } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    vi.mocked(createAdminClient).mockReturnValue({
      from: buildFromMock({ properties: { status: 'rejected' } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await adminRestoreToDraft('prop-1')
    expect(result.error).toBeUndefined()
    expect(result.success).toBe(true)
  })
})
