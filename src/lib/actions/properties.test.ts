import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache',      () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { updateProperty, deleteProperty } from './properties'

const PROP_ID  = 'prop0000-0000-0000-0000-000000000001'
const USER_ID  = 'user0000-0000-0000-0000-000000000001'
const OTHER_ID = 'user0000-0000-0000-0000-000000000002'

// ─── Mock builder ────────────────────────────────────────────────────────────

function buildClient(opts: {
  userId?: string | null
  accountStatus?: string
  updateError?: string | null
  deleteError?: string | null
}) {
  const { userId = USER_ID, accountStatus = 'active', updateError = null, deleteError = null } = opts

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: userId ? null : new Error('no session'),
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        const chain: any = { select: vi.fn(), eq: vi.fn(), single: vi.fn() }
        chain.select.mockReturnValue(chain)
        chain.eq.mockReturnValue(chain)
        chain.single.mockResolvedValue({ data: { account_status: accountStatus } })
        return chain
      }
      if (table === 'properties') {
        const chain: any = {
          update: vi.fn(),
          delete: vi.fn(),
          eq:     vi.fn(),
        }
        // chaining .update(...).eq(...).eq(...)
        chain.update.mockReturnValue(chain)
        chain.delete.mockReturnValue(chain)
        chain.eq.mockReturnValue(chain)
        // terminal resolution — last .eq() must resolve to Promise
        // We need to make the chain awaitable on its final call.
        // Override: when eq is called with 'owner_id', return a thenable
        let eqCount = 0
        chain.eq.mockImplementation((..._args: any[]) => {
          eqCount++
          // Both update and delete end with two .eq() calls; resolve on second
          if (eqCount >= 2) {
            const err = table === 'properties' && updateError
              ? { message: updateError }
              : table === 'properties' && deleteError
              ? { message: deleteError }
              : null
            return Promise.resolve({ data: null, error: err })
          }
          return chain
        })
        return chain
      }
      // property_amenities for update with amenities
      const chain: any = { delete: vi.fn(), insert: vi.fn(), eq: vi.fn() }
      chain.delete.mockReturnValue(chain)
      chain.insert.mockResolvedValue({ data: null, error: null })
      chain.eq.mockResolvedValue({ data: null, error: null })
      return chain
    }),
  }
}

// ─── updateProperty ──────────────────────────────────────────────────────────

describe('updateProperty', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects unauthenticated callers', async () => {
    vi.mocked(createClient).mockResolvedValue(buildClient({ userId: null }) as any)
    const res = await updateProperty(PROP_ID, { title: 'New title' })
    expect(res.error).toBe('Unauthorized')
  })

  it('rejects accounts that are not active', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ accountStatus: 'pending_verification' }) as any
    )
    const res = await updateProperty(PROP_ID, { title: 'New title' })
    expect(res.error).toMatch(/must be approved/i)
  })

  it('happy path: returns success for active owner', async () => {
    vi.mocked(createClient).mockResolvedValue(buildClient({}) as any)
    const res = await updateProperty(PROP_ID, { title: 'Updated title' })
    expect(res.success).toBe(true)
  })
})

// ─── deleteProperty ──────────────────────────────────────────────────────────

describe('deleteProperty', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects unauthenticated callers', async () => {
    vi.mocked(createClient).mockResolvedValue(buildClient({ userId: null }) as any)
    const res = await deleteProperty(PROP_ID)
    expect(res.error).toBe('Unauthorized')
  })

  it('happy path: owner can delete their property', async () => {
    vi.mocked(createClient).mockResolvedValue(buildClient({}) as any)
    const res = await deleteProperty(PROP_ID)
    expect(res.success).toBe(true)
  })
})
