import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { redirect } from 'next/navigation'
import type { Profile, UserRole } from '@/types/auth'
import { ROLE_DASHBOARDS } from '@/types/auth'
import { APPROVAL_REQUIRED_ROLES, ROLE_PROTECTED_PREFIXES } from '@/lib/utils/constants'
import { requireActiveProfile } from './account-status'

const ALL_ROLES: UserRole[] = [
  'admin', 'buyer', 'seller', 'agent', 'vendor',
  'contractor', 'engineer', 'architect', 'lawyer',
]

function makeProfile(overrides: Partial<Profile>): Profile {
  return {
    id: 'user-1',
    email: 'user@example.com',
    full_name: null,
    display_name: null,
    role: 'buyer',
    city: null,
    phone: null,
    phone_verified: false,
    avatar_url: null,
    bio: null,
    is_verified: false,
    is_premium: false,
    is_public: true,
    profile_view_count: 0,
    account_status: 'active',
    onboarding_completed: true,
    expo_push_token: null,
    approved_at: null,
    approved_by: null,
    rejected_at: null,
    rejected_by: null,
    registration_completed_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('APPROVAL_REQUIRED_ROLES', () => {
  it('excludes buyer (auto-approved) and includes exactly the other 7 roles', () => {
    expect(APPROVAL_REQUIRED_ROLES).not.toContain('buyer')
    expect(APPROVAL_REQUIRED_ROLES).not.toContain('admin')
    expect([...APPROVAL_REQUIRED_ROLES].sort()).toEqual(
      ['agent', 'architect', 'contractor', 'engineer', 'lawyer', 'seller', 'vendor'].sort()
    )
  })
})

describe('ROLE_DASHBOARDS / ROLE_PROTECTED_PREFIXES consistency', () => {
  it.each(ALL_ROLES)('role "%s" has a dashboard path covered by ROLE_PROTECTED_PREFIXES for that role', (role) => {
    const dashboardPath = ROLE_DASHBOARDS[role]
    expect(dashboardPath).toBeDefined()

    const matchingPrefix = Object.keys(ROLE_PROTECTED_PREFIXES).find((prefix) =>
      dashboardPath.startsWith(prefix)
    )

    expect(matchingPrefix).toBeDefined()
    expect(ROLE_PROTECTED_PREFIXES[matchingPrefix as string]).toContain(role)
  })
})

describe('requireActiveProfile', () => {
  beforeEach(() => {
    vi.mocked(redirect).mockClear()
  })

  it('does not redirect a buyer regardless of account_status', () => {
    requireActiveProfile(makeProfile({ role: 'buyer', account_status: 'pending_verification' }))
    expect(redirect).not.toHaveBeenCalled()
  })

  it('does not redirect an active professional', () => {
    requireActiveProfile(makeProfile({ role: 'seller', account_status: 'active' }))
    expect(redirect).not.toHaveBeenCalled()
  })

  it('redirects a pending professional to /account/pending', () => {
    requireActiveProfile(makeProfile({ role: 'seller', account_status: 'pending_verification' }))
    expect(redirect).toHaveBeenCalledWith('/account/pending')
  })

  it('redirects a suspended professional to /account/suspended', () => {
    requireActiveProfile(makeProfile({ role: 'agent', account_status: 'suspended' }))
    expect(redirect).toHaveBeenCalledWith('/account/suspended')
  })

  it('redirects a banned professional to /account/banned', () => {
    requireActiveProfile(makeProfile({ role: 'lawyer', account_status: 'banned' }))
    expect(redirect).toHaveBeenCalledWith('/account/banned')
  })
})
