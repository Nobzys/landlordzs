import { describe, it, expect, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { createProperty } from './properties'

const mockUser = { id: 'user-1' }

function buildSupabaseMock(profile: { account_status: string; role: string } | null) {
  const from = vi.fn((table: string) => {
    if (table === 'profiles_safe') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: profile }) }) }) }
    }
    if (table === 'properties') {
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({ data: { id: 'prop-1', slug: 'test-listing-123' }, error: null }),
          }),
        }),
      }
    }
    if (table === 'property_amenities') {
      return { insert: async () => ({ data: null, error: null }) }
    }
    throw new Error(`Unexpected table queried in test: ${table}`)
  })

  return {
    auth: { getUser: async () => ({ data: { user: mockUser }, error: null }) },
    from,
  }
}

const validInput = {
  title: 'Spacious Duplex in Bonapriso',
  listing_type: 'sale',
  property_type: 'duplex',
  city: 'douala',
  price: 50000000,
  is_negotiable: false,
  bedrooms: 4,
  bathrooms: 3,
  toilets: 4,
  land_title: 'titre_foncier',
  is_furnished: false,
  has_security: false,
  has_generator: false,
  has_borehole: false,
  amenities: [] as never[],
}

describe('createProperty RBAC (Sprint 1, Task 1)', () => {
  const cases: { role: string; allowed: boolean }[] = [
    { role: 'seller', allowed: true },
    { role: 'agent', allowed: true },
    { role: 'admin', allowed: true },
    { role: 'buyer', allowed: false },
    { role: 'vendor', allowed: false },
    { role: 'contractor', allowed: false },
    { role: 'engineer', allowed: false },
    { role: 'architect', allowed: false },
    { role: 'lawyer', allowed: false },
  ]

  for (const { role, allowed } of cases) {
    it(`${allowed ? 'allows' : 'denies'} role "${role}"`, async () => {
      vi.mocked(createClient).mockResolvedValue(
        buildSupabaseMock({ account_status: 'active', role }) as never
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await createProperty(validInput as any)

      if (allowed) {
        expect(result.error).toBeUndefined()
        expect(result.success).toBe(true)
      } else {
        expect(result.error).toBe('Your account type is not permitted to create property listings.')
      }
    })
  }

  it('still blocks an authorized role whose account is not yet active', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ account_status: 'pending_verification', role: 'seller' }) as never
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createProperty(validInput as any)
    expect(result.error).toBe('Your account must be approved before creating listings.')
  })

  it('rejects unauthenticated requests before checking role', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
      from: vi.fn(),
    } as never)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createProperty(validInput as any)
    expect(result.error).toBe('Unauthorized')
  })

  it('rejects a profile row that no longer exists', async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock(null) as never)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createProperty(validInput as any)
    expect(result.error).toBe('Your account type is not permitted to create property listings.')
  })
})
