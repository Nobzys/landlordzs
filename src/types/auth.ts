import type { User } from '@supabase/supabase-js'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'admin'
  | 'buyer'
  | 'seller'
  | 'agent'
  | 'vendor'
  | 'contractor'
  | 'engineer'
  | 'architect'
  | 'lawyer'

export type AccountStatus =
  | 'active'
  | 'suspended'
  | 'banned'
  | 'pending_verification'

export type CameroonCity =
  | 'yaounde'
  | 'douala'
  | 'buea'
  | 'bamenda'
  | 'limbe'
  | 'kribi'
  | 'bafoussam'
  | 'ngaoundere'
  | 'maroua'
  | 'bertoua'
  | 'ebolowa'
  | 'kumba'

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  full_name: string | null
  display_name: string | null
  role: UserRole
  city: CameroonCity | null
  phone: string | null
  phone_verified: boolean
  avatar_url: string | null
  bio: string | null
  is_verified: boolean
  verified_at: string | null
  is_premium: boolean
  is_public: boolean
  profile_view_count: number
  account_status: AccountStatus
  onboarding_completed: boolean
  expo_push_token: string | null
  approved_at: string | null
  approved_by: string | null
  rejected_at: string | null
  rejected_by: string | null
  registration_completed_at: string | null
  // Public Profiles
  slug: string | null
  cover_url: string | null
  company_name: string | null
  years_experience: number | null
  specialties: string[]
  service_areas: string[]
  website_url: string | null
  kyc_level: string
  email_visibility: boolean
  phone_visibility: boolean
  created_at: string
  updated_at: string
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface SessionWithProfile {
  user: User
  profile: Profile | null
}

// ─── Action result pattern ────────────────────────────────────────────────────
// Server actions return this type; client handles redirect.

export interface ActionResult<T = undefined> {
  error?: string
  success?: boolean
  data?: T
}

// ─── Role metadata ────────────────────────────────────────────────────────────

export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin:      '/admin',
  buyer:      '/buyer/favorites',
  seller:     '/seller/listings',
  agent:      '/agent/commissions',
  vendor:     '/vendor',
  contractor: '/contractor',
  engineer:   '/engineer',
  architect:  '/architect',
  lawyer:     '/lawyer',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:      'Administrator',
  buyer:      'Property Buyer',
  seller:     'Property Seller',
  agent:      'Real Estate Agent',
  vendor:     'Material Vendor',
  contractor: 'Contractor',
  engineer:   'Engineer',
  architect:  'Architect',
  lawyer:     'Lawyer',
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin:      'Platform administrator with full access',
  buyer:      'Search, favorite, and inquire about properties',
  seller:     'List your properties for sale or rent',
  agent:      'Represent clients and earn commissions on sales',
  vendor:     'Sell building materials and construction supplies',
  contractor: 'Offer construction and renovation services',
  engineer:   'Provide civil and structural engineering consultancy',
  architect:  'Offer architectural design and planning services',
  lawyer:     'Handle property law, conveyancing, and land disputes',
}

// Roles available during self-registration (admin assigned separately)
export const REGISTERABLE_ROLES = [
  'buyer', 'seller', 'agent', 'vendor',
  'contractor', 'engineer', 'architect', 'lawyer',
] as const satisfies Readonly<UserRole[]>

export type RegisterableRole = (typeof REGISTERABLE_ROLES)[number]
