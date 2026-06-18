// Single source of truth for what a role can do in the trust system
// (avatars, public profiles, verification badges, reviews, portfolios,
// completeness scoring). Nothing in the app should branch on a literal
// role array — it should ask this config for a capability instead.
//
// `SpecRole` is a superset of the live `UserRole` enum: it also carries
// entries for roles named in the master specification that do not yet
// exist in the database (`property_developer`, `property_manager`,
// `surveyor_valuer`, `waste_cleaning`, `moderator`, `support`,
// `super_admin`). Those entries are forward-compatible documentation only
// — no account can take these roles today, no DB/RLS change was made for
// them, and no runtime code path is reachable with one of these values.
// When/if those roles are added to `UserRole`, every trust feature here
// already knows what to do with them.

import type { UserRole } from '@/types/auth'

export type FutureRole =
  | 'property_developer'
  | 'property_manager'
  | 'surveyor_valuer'
  | 'waste_cleaning'
  | 'moderator'
  | 'support'
  | 'super_admin'

export type SpecRole = UserRole | FutureRole

export type ProfileExtensionTable =
  | 'agent_profiles'
  | 'vendor_profiles'
  | 'professional_profiles'
  | null

export type PublicProfileGroup = 'sellers' | 'professionals' | null

export interface RoleCapabilities {
  /** Can ever carry a verification badge (gated additionally on is_verified at render time). */
  canBeVerified: boolean
  /** Has a public-facing profile page at all. */
  hasPublicProfile: boolean
  /** Which public route group the profile lives under, if any. */
  publicProfileGroup: PublicProfileGroup
  /** Which role-specific extension table (if any) backs the public profile. */
  profileTable: ProfileExtensionTable
  /** Can manage a portfolio (portfolio_items/portfolio_images). */
  hasPortfolio: boolean
  /** Has a slug-based storefront (vendor_profiles.store_slug today). */
  hasStorefront: boolean
  /** Aggregated via the reviews target_type/target_id polymorphic pair + refresh_rating() trigger. */
  receivesReviews: boolean
  /** Internal/staff role — never self-registered, never has a public profile. */
  isStaff: boolean
}

const PROFESSIONAL_SHAPE: RoleCapabilities = {
  canBeVerified: true,
  hasPublicProfile: true,
  publicProfileGroup: 'professionals',
  profileTable: 'professional_profiles',
  hasPortfolio: true,
  hasStorefront: false,
  receivesReviews: true,
  isStaff: false,
}

const STAFF_SHAPE: RoleCapabilities = {
  canBeVerified: false,
  hasPublicProfile: false,
  publicProfileGroup: null,
  profileTable: null,
  hasPortfolio: false,
  hasStorefront: false,
  receivesReviews: false,
  isStaff: true,
}

export const ROLE_CAPABILITIES: Record<SpecRole, RoleCapabilities> = {
  buyer: {
    canBeVerified: false,
    hasPublicProfile: false,
    publicProfileGroup: null,
    profileTable: null,
    hasPortfolio: false,
    hasStorefront: false,
    receivesReviews: false,
    isStaff: false,
  },
  seller: {
    canBeVerified: true,
    hasPublicProfile: true,
    publicProfileGroup: 'sellers',
    profileTable: null,
    hasPortfolio: false,
    hasStorefront: false,
    receivesReviews: false,
    isStaff: false,
  },
  agent: {
    canBeVerified: true,
    hasPublicProfile: true,
    publicProfileGroup: 'professionals',
    profileTable: 'agent_profiles',
    hasPortfolio: false,
    hasStorefront: false,
    receivesReviews: true,
    isStaff: false,
  },
  vendor: {
    canBeVerified: true,
    hasPublicProfile: true,
    publicProfileGroup: 'professionals',
    profileTable: 'vendor_profiles',
    hasPortfolio: false,
    hasStorefront: true,
    receivesReviews: true,
    isStaff: false,
  },
  contractor: PROFESSIONAL_SHAPE,
  engineer: PROFESSIONAL_SHAPE,
  architect: PROFESSIONAL_SHAPE,
  lawyer: PROFESSIONAL_SHAPE,
  admin: STAFF_SHAPE,

  // Forward-compatible only — see module header.
  property_developer: PROFESSIONAL_SHAPE,
  property_manager: PROFESSIONAL_SHAPE,
  surveyor_valuer: PROFESSIONAL_SHAPE,
  waste_cleaning: PROFESSIONAL_SHAPE,
  moderator: STAFF_SHAPE,
  support: STAFF_SHAPE,
  super_admin: STAFF_SHAPE,
}

export function getCapabilities(role: SpecRole): RoleCapabilities {
  return ROLE_CAPABILITIES[role]
}

export function hasCapability<K extends keyof RoleCapabilities>(
  role: SpecRole,
  key: K
): RoleCapabilities[K] {
  return ROLE_CAPABILITIES[role][key]
}

/** Public profile URL for a role+id, or null if the role has no public profile. */
export function getPublicProfilePath(role: SpecRole, id: string): string | null {
  const group = ROLE_CAPABILITIES[role].publicProfileGroup
  if (!group) return null
  return `/${group}/${id}`
}
