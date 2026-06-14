import type { UserRole, CameroonCity } from '@/types/auth'

export { ROLE_DASHBOARDS, ROLE_LABELS, ROLE_DESCRIPTIONS, REGISTERABLE_ROLES } from '@/types/auth'

// ─── App ──────────────────────────────────────────────────────────────────────

export const APP_NAME   = 'LANDLORDZS'
export const APP_URL    = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
export const SUPPORT_EMAIL = 'support@landlordzs.com'

// ─── Routes ───────────────────────────────────────────────────────────────────

export const PUBLIC_ROUTES = [
  '/',
  '/properties',
  '/rentals',
  '/materials',
  '/professionals',
  '/services',
  '/jobs',
  '/community',
  '/about',
  '/contact',
]

export const AUTH_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
]

export const ROLE_PROTECTED_PREFIXES: Record<string, UserRole> = {
  '/buyer':      'buyer',
  '/seller':     'seller',
  '/agent':      'agent',
  '/vendor':     'vendor',
  '/contractor': 'contractor',
  '/engineer':   'engineer',
  '/architect':  'architect',
  '/lawyer':     'lawyer',
  '/admin':      'admin',
}

// ─── Cameroon data ────────────────────────────────────────────────────────────

export const CAMEROON_CITIES: { value: CameroonCity; label: string; region: string }[] = [
  { value: 'yaounde',    label: 'Yaoundé',      region: 'Centre' },
  { value: 'douala',     label: 'Douala',        region: 'Littoral' },
  { value: 'bafoussam',  label: 'Bafoussam',     region: 'West' },
  { value: 'bamenda',    label: 'Bamenda',       region: 'North West' },
  { value: 'buea',       label: 'Buea',          region: 'South West' },
  { value: 'limbe',      label: 'Limbe',         region: 'South West' },
  { value: 'kribi',      label: 'Kribi',         region: 'South' },
  { value: 'bertoua',    label: 'Bertoua',       region: 'East' },
  { value: 'ebolowa',    label: 'Ebolowa',       region: 'South' },
  { value: 'ngaoundere', label: 'Ngaoundéré',    region: 'Adamawa' },
  { value: 'maroua',     label: 'Maroua',        region: 'Far North' },
  { value: 'kumba',      label: 'Kumba',         region: 'South West' },
]

export const CAMEROON_PHONE_PREFIX = '+237'

// ─── Storage ──────────────────────────────────────────────────────────────────

export const STORAGE_BUCKETS = {
  PROPERTY_IMAGES:   'property-images',
  PROPERTY_VIDEOS:   'property-videos',
  USER_AVATARS:      'user-avatars',
  VERIFY_DOCS:       'verification-docs',
  MARKETPLACE:       'marketplace-products',
  PORTFOLIOS:        'service-portfolios',
  FORUM_IMAGES:      'forum-images',
  CHAT_ATTACHMENTS:  'chat-attachments',
} as const

export const PROFESSIONAL_ROLES = [
  'agent', 'contractor', 'engineer', 'architect', 'lawyer',
] as const
export type ProfessionalRole = (typeof PROFESSIONAL_ROLES)[number]

// ─── Onboarding ───────────────────────────────────────────────────────────────

export const ONBOARDING_STEPS = {
  BASIC_PROFILE: 1,
  ROLE_PROFILE:  2,
} as const

export const TOTAL_ONBOARDING_STEPS = Object.keys(ONBOARDING_STEPS).length

// ─── Specializations by role ──────────────────────────────────────────────────

export const ROLE_SPECIALIZATIONS: Record<string, { value: string; label: string }[]> = {
  agent: [
    { value: 'residential',   label: 'Residential' },
    { value: 'commercial',    label: 'Commercial' },
    { value: 'land',          label: 'Land' },
    { value: 'rental',        label: 'Rental' },
    { value: 'industrial',    label: 'Industrial' },
  ],
  contractor: [
    { value: 'residential_construction', label: 'Residential Construction' },
    { value: 'commercial_construction',  label: 'Commercial Construction' },
    { value: 'renovation',               label: 'Renovation' },
    { value: 'masonry',                  label: 'Masonry' },
    { value: 'tiling',                   label: 'Tiling' },
    { value: 'roofing',                  label: 'Roofing' },
    { value: 'plumbing',                 label: 'Plumbing' },
    { value: 'electrical',               label: 'Electrical' },
  ],
  engineer: [
    { value: 'structural',           label: 'Structural Engineering' },
    { value: 'civil',                label: 'Civil Engineering' },
    { value: 'soil_testing',         label: 'Soil Testing' },
    { value: 'project_supervision',  label: 'Project Supervision' },
    { value: 'bill_of_quantities',   label: 'Bill of Quantities' },
    { value: 'mechanical',           label: 'Mechanical' },
    { value: 'electrical_eng',       label: 'Electrical Engineering' },
  ],
  architect: [
    { value: 'residential_design',  label: 'Residential Design' },
    { value: 'commercial_design',   label: 'Commercial Design' },
    { value: 'interior_design',     label: 'Interior Design' },
    { value: 'urban_planning',      label: 'Urban Planning' },
    { value: 'landscape_design',    label: 'Landscape Design' },
  ],
  lawyer: [
    { value: 'property_law',   label: 'Property Law' },
    { value: 'contract_law',   label: 'Contract Law' },
    { value: 'land_disputes',  label: 'Land Disputes' },
    { value: 'conveyancing',   label: 'Conveyancing' },
    { value: 'tenant_rights',  label: 'Tenant Rights' },
    { value: 'commercial_law', label: 'Commercial Law' },
  ],
}
