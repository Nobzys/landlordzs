import type { User } from '@supabase/supabase-js'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'admin'
  | 'moderator'
  | 'buyer'
  | 'seller'
  | 'agent'
  | 'vendor'
  | 'contractor'
  | 'engineer'
  | 'architect'
  | 'lawyer'
  | 'property_manager'
  | 'maintenance'
  | 'cleaning_services'

export type AccountStatus =
  | 'active'
  | 'suspended'
  | 'banned'
  | 'pending_verification'
  | 'deactivated'

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
  is_premium: boolean
  account_status: AccountStatus
  onboarding_completed: boolean
  expo_push_token: string | null
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
  admin:            '/admin',
  moderator:        '/admin',
  buyer:            '/buyer/favorites',
  seller:           '/seller/listings',
  agent:            '/agent',
  vendor:           '/vendor',
  contractor:       '/contractor',
  engineer:         '/engineer',
  architect:        '/architect',
  lawyer:           '/lawyer',
  property_manager:  '/property-manager',
  maintenance:       '/maintenance',
  cleaning_services: '/cleaning-services',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:            'Administrator',
  moderator:        'Moderator',
  buyer:            'Property Buyer',
  seller:           'Property Seller',
  agent:            'Real Estate Agent',
  vendor:           'Material Vendor',
  contractor:       'Contractor',
  engineer:         'Engineer',
  architect:        'Architect',
  lawyer:           'Lawyer',
  property_manager:  'Property Manager',
  maintenance:       'Maintenance Worker',
  cleaning_services: 'Cleaning Services Professional',
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin:            'Platform administrator with full access',
  moderator:        'Platform moderator — review content and user reports',
  buyer:            'Search, favorite, and inquire about properties',
  seller:           'List your properties for sale or rent',
  agent:            'Represent clients and earn commissions on sales',
  vendor:           'Sell building materials and construction supplies',
  contractor:       'Offer construction and renovation services',
  engineer:         'Provide civil and structural engineering consultancy',
  architect:        'Offer architectural design and planning services',
  lawyer:           'Handle property law, conveyancing, and land disputes',
  property_manager:  'Manage rental properties on behalf of landlords — tenant screening, rent collection, maintenance coordination',
  maintenance:       'Offer property maintenance and repair services — plumbing, electrical, painting, and general upkeep',
  cleaning_services: 'Provide professional cleaning services for residential and commercial properties',
}

// Roles available during self-registration (admin assigned separately)
export const REGISTERABLE_ROLES = [
  'buyer', 'seller', 'agent', 'vendor',
  'contractor', 'engineer', 'architect', 'lawyer',
  'property_manager', 'maintenance', 'cleaning_services',
] as const satisfies Readonly<UserRole[]>

export type RegisterableRole = (typeof REGISTERABLE_ROLES)[number]
