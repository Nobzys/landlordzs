import type { UserRole } from '@/types/auth'

// ─── Capability shape ─────────────────────────────────────────────────────────

interface RoleCapabilities {
  // ── Property ──────────────────────────────────────────────────────────────
  /** Can create new property listings */
  canCreateProperty: boolean
  /** Can view and edit properties assigned to them by an owner */
  canManageAssignedProperties: boolean

  // ── Portfolio & Storefront ────────────────────────────────────────────────
  /** Can manage a professional portfolio (projects + images) */
  canManagePortfolio: boolean
  /** Can manage a vendor storefront */
  canManageStorefront: boolean

  // ── Services & Leads ──────────────────────────────────────────────────────
  /** Can create and publish a service listing */
  canCreateServiceListing: boolean
  /** Can receive inbound service requests from buyers / tenants */
  canReceiveServiceRequests: boolean
  /** Can receive inbound property leads (buyer / tenant enquiries) */
  canReceivePropertyLeads: boolean
  /** Can provide legal consultation and conveyancing services */
  canProvideLegalServices: boolean

  // ── Bookings & Orders ─────────────────────────────────────────────────────
  /** Can place appointment bookings with professionals */
  canBookAppointments: boolean
  /** Can receive appointment bookings from clients */
  canReceiveBookings: boolean
  /** Can place product orders through vendor storefronts */
  canReceiveOrders: boolean
  /** Can request quotes from service providers */
  canRequestQuotes: boolean

  // ── Financial ─────────────────────────────────────────────────────────────
  /** Can participate in escrow transactions */
  canUseEscrow: boolean
  /** Can receive payouts from completed transactions */
  canReceivePayouts: boolean

  // ── Platform ──────────────────────────────────────────────────────────────
  /** Must upload credentials and pass identity verification */
  requiresProfessionalVerification: boolean
  /** Account requires admin activation before posting content */
  requiresActivationFee: boolean
  /** Can access the /admin section */
  canAccessAdmin: boolean
  /** Appears on the public /professionals directory */
  isPublicProfessional: boolean
  /** Can self-register (false = admin-assigned only) */
  canRegisterSelf: boolean
}

// ─── Single source of truth ───────────────────────────────────────────────────
//
// Every field must be explicitly true or false for every role.
// Do not use optional fields — a missing value is a bug.

export const ROLE_CAPABILITIES: Record<UserRole, RoleCapabilities> = {
  // ── admin ──────────────────────────────────────────────────────────────────
  admin: {
    canCreateProperty:               true,
    canManageAssignedProperties:     true,
    canManagePortfolio:              false,
    canManageStorefront:             false,
    canCreateServiceListing:         false,
    canReceiveServiceRequests:       false,
    canReceivePropertyLeads:         false,
    canProvideLegalServices:         false,
    canBookAppointments:             false,
    canReceiveBookings:              false,
    canReceiveOrders:                false,
    canRequestQuotes:                false,
    canUseEscrow:                    true,
    canReceivePayouts:               false,
    requiresProfessionalVerification: false,
    requiresActivationFee:           false,
    canAccessAdmin:                  true,
    isPublicProfessional:            false,
    canRegisterSelf:                 false,
  },

  // ── buyer ──────────────────────────────────────────────────────────────────
  buyer: {
    canCreateProperty:               false,
    canManageAssignedProperties:     false,
    canManagePortfolio:              false,
    canManageStorefront:             false,
    canCreateServiceListing:         false,
    canReceiveServiceRequests:       false,
    canReceivePropertyLeads:         false,
    canProvideLegalServices:         false,
    canBookAppointments:             true,
    canReceiveBookings:              false,
    canReceiveOrders:                false,
    canRequestQuotes:                true,
    canUseEscrow:                    true,
    canReceivePayouts:               false,
    requiresProfessionalVerification: false,
    requiresActivationFee:           false,
    canAccessAdmin:                  false,
    isPublicProfessional:            false,
    canRegisterSelf:                 true,
  },

  // ── tenant ─────────────────────────────────────────────────────────────────
  tenant: {
    canCreateProperty:               false,
    canManageAssignedProperties:     false,
    canManagePortfolio:              false,
    canManageStorefront:             false,
    canCreateServiceListing:         false,
    canReceiveServiceRequests:       false,
    canReceivePropertyLeads:         false,
    canProvideLegalServices:         false,
    canBookAppointments:             true,
    canReceiveBookings:              false,
    canReceiveOrders:                false,
    canRequestQuotes:                true,
    canUseEscrow:                    true,
    canReceivePayouts:               false,
    requiresProfessionalVerification: false,
    requiresActivationFee:           false,
    canAccessAdmin:                  false,
    isPublicProfessional:            false,
    canRegisterSelf:                 true,
  },

  // ── seller ─────────────────────────────────────────────────────────────────
  seller: {
    canCreateProperty:               true,
    canManageAssignedProperties:     false,
    canManagePortfolio:              false,
    canManageStorefront:             false,
    canCreateServiceListing:         false,
    canReceiveServiceRequests:       false,
    canReceivePropertyLeads:         false,
    canProvideLegalServices:         false,
    canBookAppointments:             true,
    canReceiveBookings:              false,
    canReceiveOrders:                false,
    canRequestQuotes:                true,
    canUseEscrow:                    true,
    canReceivePayouts:               true,
    requiresProfessionalVerification: false,
    requiresActivationFee:           true,
    canAccessAdmin:                  false,
    isPublicProfessional:            false,
    canRegisterSelf:                 true,
  },

  // ── agent ──────────────────────────────────────────────────────────────────
  agent: {
    canCreateProperty:               true,
    canManageAssignedProperties:     false,
    canManagePortfolio:              false,
    canManageStorefront:             false,
    canCreateServiceListing:         false,
    canReceiveServiceRequests:       false,
    canReceivePropertyLeads:         true,
    canProvideLegalServices:         false,
    canBookAppointments:             true,
    canReceiveBookings:              true,
    canReceiveOrders:                false,
    canRequestQuotes:                false,
    canUseEscrow:                    true,
    canReceivePayouts:               true,
    requiresProfessionalVerification: true,
    requiresActivationFee:           true,
    canAccessAdmin:                  false,
    isPublicProfessional:            true,
    canRegisterSelf:                 true,
  },

  // ── vendor ─────────────────────────────────────────────────────────────────
  vendor: {
    canCreateProperty:               false,
    canManageAssignedProperties:     false,
    canManagePortfolio:              false,
    canManageStorefront:             true,
    canCreateServiceListing:         false,
    canReceiveServiceRequests:       false,
    canReceivePropertyLeads:         false,
    canProvideLegalServices:         false,
    canBookAppointments:             false,
    canReceiveBookings:              false,
    canReceiveOrders:                true,
    canRequestQuotes:                false,
    canUseEscrow:                    true,
    canReceivePayouts:               true,
    requiresProfessionalVerification: false,
    requiresActivationFee:           true,
    canAccessAdmin:                  false,
    isPublicProfessional:            true,
    canRegisterSelf:                 true,
  },

  // ── contractor ─────────────────────────────────────────────────────────────
  contractor: {
    canCreateProperty:               false,
    canManageAssignedProperties:     false,
    canManagePortfolio:              true,
    canManageStorefront:             false,
    canCreateServiceListing:         true,
    canReceiveServiceRequests:       true,
    canReceivePropertyLeads:         false,
    canProvideLegalServices:         false,
    canBookAppointments:             false,
    canReceiveBookings:              true,
    canReceiveOrders:                false,
    canRequestQuotes:                false,
    canUseEscrow:                    true,
    canReceivePayouts:               true,
    requiresProfessionalVerification: true,
    requiresActivationFee:           true,
    canAccessAdmin:                  false,
    isPublicProfessional:            true,
    canRegisterSelf:                 true,
  },

  // ── engineer ───────────────────────────────────────────────────────────────
  engineer: {
    canCreateProperty:               false,
    canManageAssignedProperties:     false,
    canManagePortfolio:              true,
    canManageStorefront:             false,
    canCreateServiceListing:         true,
    canReceiveServiceRequests:       true,
    canReceivePropertyLeads:         false,
    canProvideLegalServices:         false,
    canBookAppointments:             false,
    canReceiveBookings:              true,
    canReceiveOrders:                false,
    canRequestQuotes:                false,
    canUseEscrow:                    true,
    canReceivePayouts:               true,
    requiresProfessionalVerification: true,
    requiresActivationFee:           true,
    canAccessAdmin:                  false,
    isPublicProfessional:            true,
    canRegisterSelf:                 true,
  },

  // ── architect ──────────────────────────────────────────────────────────────
  architect: {
    canCreateProperty:               false,
    canManageAssignedProperties:     false,
    canManagePortfolio:              true,
    canManageStorefront:             false,
    canCreateServiceListing:         true,
    canReceiveServiceRequests:       true,
    canReceivePropertyLeads:         false,
    canProvideLegalServices:         false,
    canBookAppointments:             false,
    canReceiveBookings:              true,
    canReceiveOrders:                false,
    canRequestQuotes:                false,
    canUseEscrow:                    true,
    canReceivePayouts:               true,
    requiresProfessionalVerification: true,
    requiresActivationFee:           true,
    canAccessAdmin:                  false,
    isPublicProfessional:            true,
    canRegisterSelf:                 true,
  },

  // ── lawyer ─────────────────────────────────────────────────────────────────
  lawyer: {
    canCreateProperty:               false,
    canManageAssignedProperties:     false,
    canManagePortfolio:              false,
    canManageStorefront:             false,
    canCreateServiceListing:         true,
    canReceiveServiceRequests:       true,
    canReceivePropertyLeads:         false,
    canProvideLegalServices:         true,
    canBookAppointments:             false,
    canReceiveBookings:              true,
    canReceiveOrders:                false,
    canRequestQuotes:                false,
    canUseEscrow:                    true,
    canReceivePayouts:               true,
    requiresProfessionalVerification: true,
    requiresActivationFee:           true,
    canAccessAdmin:                  false,
    isPublicProfessional:            true,
    canRegisterSelf:                 true,
  },

  // ── developer ──────────────────────────────────────────────────────────────
  developer: {
    canCreateProperty:               true,
    canManageAssignedProperties:     false,
    canManagePortfolio:              false,
    canManageStorefront:             false,
    canCreateServiceListing:         false,
    canReceiveServiceRequests:       false,
    canReceivePropertyLeads:         true,
    canProvideLegalServices:         false,
    canBookAppointments:             true,
    canReceiveBookings:              false,
    canReceiveOrders:                false,
    canRequestQuotes:                true,
    canUseEscrow:                    true,
    canReceivePayouts:               true,
    requiresProfessionalVerification: false,
    requiresActivationFee:           true,
    canAccessAdmin:                  false,
    isPublicProfessional:            true,
    canRegisterSelf:                 true,
  },

  // ── property_manager ───────────────────────────────────────────────────────
  property_manager: {
    canCreateProperty:               false,
    canManageAssignedProperties:     true,
    canManagePortfolio:              false,
    canManageStorefront:             false,
    canCreateServiceListing:         false,
    canReceiveServiceRequests:       false,
    canReceivePropertyLeads:         true,
    canProvideLegalServices:         false,
    canBookAppointments:             true,
    canReceiveBookings:              false,
    canReceiveOrders:                false,
    canRequestQuotes:                true,
    canUseEscrow:                    true,
    canReceivePayouts:               true,
    requiresProfessionalVerification: false,
    requiresActivationFee:           true,
    canAccessAdmin:                  false,
    isPublicProfessional:            true,
    canRegisterSelf:                 true,
  },

  // ── surveyor ───────────────────────────────────────────────────────────────
  surveyor: {
    canCreateProperty:               false,
    canManageAssignedProperties:     false,
    canManagePortfolio:              true,
    canManageStorefront:             false,
    canCreateServiceListing:         true,
    canReceiveServiceRequests:       true,
    canReceivePropertyLeads:         false,
    canProvideLegalServices:         false,
    canBookAppointments:             false,
    canReceiveBookings:              true,
    canReceiveOrders:                false,
    canRequestQuotes:                false,
    canUseEscrow:                    true,
    canReceivePayouts:               true,
    requiresProfessionalVerification: true,
    requiresActivationFee:           true,
    canAccessAdmin:                  false,
    isPublicProfessional:            true,
    canRegisterSelf:                 true,
  },

  // ── maintenance ────────────────────────────────────────────────────────────
  maintenance: {
    canCreateProperty:               false,
    canManageAssignedProperties:     false,
    canManagePortfolio:              false,
    canManageStorefront:             false,
    canCreateServiceListing:         true,
    canReceiveServiceRequests:       true,
    canReceivePropertyLeads:         false,
    canProvideLegalServices:         false,
    canBookAppointments:             false,
    canReceiveBookings:              true,
    canReceiveOrders:                false,
    canRequestQuotes:                false,
    canUseEscrow:                    true,
    canReceivePayouts:               true,
    requiresProfessionalVerification: false,
    requiresActivationFee:           true,
    canAccessAdmin:                  false,
    isPublicProfessional:            true,
    canRegisterSelf:                 true,
  },
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function cap(role: string): RoleCapabilities | undefined {
  return ROLE_CAPABILITIES[role as UserRole]
}

// Property
export function canCreateProperty(role: string): boolean {
  return cap(role)?.canCreateProperty ?? false
}
export function canManageAssignedProperties(role: string): boolean {
  return cap(role)?.canManageAssignedProperties ?? false
}

// Portfolio & Storefront
export function canManagePortfolio(role: string): boolean {
  return cap(role)?.canManagePortfolio ?? false
}
export function canManageStorefront(role: string): boolean {
  return cap(role)?.canManageStorefront ?? false
}

// Services & Leads
export function canCreateServiceListing(role: string): boolean {
  return cap(role)?.canCreateServiceListing ?? false
}
export function canReceiveServiceRequests(role: string): boolean {
  return cap(role)?.canReceiveServiceRequests ?? false
}
export function canReceivePropertyLeads(role: string): boolean {
  return cap(role)?.canReceivePropertyLeads ?? false
}
export function canProvideLegalServices(role: string): boolean {
  return cap(role)?.canProvideLegalServices ?? false
}

// Bookings & Orders
export function canBookAppointments(role: string): boolean {
  return cap(role)?.canBookAppointments ?? false
}
export function canReceiveBookings(role: string): boolean {
  return cap(role)?.canReceiveBookings ?? false
}
export function canReceiveOrders(role: string): boolean {
  return cap(role)?.canReceiveOrders ?? false
}
export function canRequestQuotes(role: string): boolean {
  return cap(role)?.canRequestQuotes ?? false
}

// Financial
export function canUseEscrow(role: string): boolean {
  return cap(role)?.canUseEscrow ?? false
}
export function canReceivePayouts(role: string): boolean {
  return cap(role)?.canReceivePayouts ?? false
}

// Platform
export function requiresProfessionalVerification(role: string): boolean {
  return cap(role)?.requiresProfessionalVerification ?? false
}
export function requiresActivationFee(role: string): boolean {
  return cap(role)?.requiresActivationFee ?? false
}
export function canAccessAdmin(role: string): boolean {
  return cap(role)?.canAccessAdmin ?? false
}
export function isPublicProfessional(role: string): boolean {
  return cap(role)?.isPublicProfessional ?? false
}
export function canRegisterSelf(role: string): boolean {
  return cap(role)?.canRegisterSelf ?? false
}

// ─── Derived role sets ────────────────────────────────────────────────────────
// Computed once at module load. Use these instead of inline array literals.

type Entry = [UserRole, RoleCapabilities]

export const PROPERTY_CREATOR_ROLES: UserRole[] = (
  Object.entries(ROLE_CAPABILITIES) as Entry[]
).filter(([, c]) => c.canCreateProperty).map(([r]) => r)

export const ASSIGNED_PROPERTY_ROLES: UserRole[] = (
  Object.entries(ROLE_CAPABILITIES) as Entry[]
).filter(([, c]) => c.canManageAssignedProperties).map(([r]) => r)

export const PORTFOLIO_ROLES: UserRole[] = (
  Object.entries(ROLE_CAPABILITIES) as Entry[]
).filter(([, c]) => c.canManagePortfolio).map(([r]) => r)

export const PUBLIC_PROFESSIONAL_ROLES: UserRole[] = (
  Object.entries(ROLE_CAPABILITIES) as Entry[]
).filter(([, c]) => c.isPublicProfessional).map(([r]) => r)

export const VERIFICATION_REQUIRED_ROLES: UserRole[] = (
  Object.entries(ROLE_CAPABILITIES) as Entry[]
).filter(([, c]) => c.requiresProfessionalVerification).map(([r]) => r)

export const ACTIVATION_REQUIRED_ROLES: UserRole[] = (
  Object.entries(ROLE_CAPABILITIES) as Entry[]
).filter(([, c]) => c.requiresActivationFee).map(([r]) => r)
