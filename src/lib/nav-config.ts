import type { UserRole } from '@/types/auth'

export interface NavItem {
  label: string
  href: string
  icon: string
  exact?: boolean
}

const NOTIFICATIONS_NAV: NavItem = { label: 'Notifications', href: '/account/notifications', icon: 'Bell', exact: true }

export const ROLE_NAV: Record<UserRole, NavItem[]> = {
  buyer: [
    { label: 'Saved Properties', href: '/buyer/favorites',    icon: 'Heart' },
    { label: 'My Requests',      href: '/account/requests',   icon: 'Inbox' },
    { label: 'Browse',           href: '/properties',          icon: 'Search',  exact: true },
    { label: 'My Profile',       href: '/account/profile',     icon: 'User' },
    { label: 'Wallet',           href: '/account/wallet',      icon: 'Wallet' },
    NOTIFICATIONS_NAV,
  ],
  seller: [
    { label: 'My Listings',  href: '/seller/listings',     icon: 'Building2' },
    { label: 'New Listing',  href: '/seller/listings/new', icon: 'Plus',      exact: true },
    { label: 'My Requests',  href: '/account/requests',    icon: 'Inbox' },
    { label: 'My Profile',   href: '/account/profile',     icon: 'User' },
    { label: 'Wallet',       href: '/account/wallet',      icon: 'Wallet' },
    NOTIFICATIONS_NAV,
  ],
  agent: [
    { label: 'Commissions',  href: '/agent/commissions',   icon: 'TrendingUp' },
    { label: 'My Listings',  href: '/seller/listings',     icon: 'Building2' },
    { label: 'New Listing',  href: '/seller/listings/new', icon: 'Plus',       exact: true },
    { label: 'My Profile',   href: '/account/profile',     icon: 'User' },
    { label: 'Wallet',       href: '/account/wallet',      icon: 'Wallet' },
    NOTIFICATIONS_NAV,
  ],
  vendor: [
    { label: 'Store Overview',   href: '/vendor',             icon: 'Store',      exact: true },
    { label: 'Service Requests', href: '/account/leads',      icon: 'Inbox' },
    { label: 'My Profile',       href: '/account/profile',    icon: 'User' },
    { label: 'Wallet',           href: '/account/wallet',     icon: 'Wallet' },
    NOTIFICATIONS_NAV,
  ],
  contractor: [
    { label: 'Dashboard',        href: '/contractor',         icon: 'Briefcase',  exact: true },
    { label: 'Service Requests', href: '/account/leads',      icon: 'Inbox' },
    { label: 'Portfolio',        href: '/account/portfolio',  icon: 'FolderOpen' },
    { label: 'My Profile',       href: '/account/profile',    icon: 'User' },
    { label: 'Wallet',           href: '/account/wallet',     icon: 'Wallet' },
    NOTIFICATIONS_NAV,
  ],
  engineer: [
    { label: 'Dashboard',        href: '/engineer',           icon: 'Wrench',     exact: true },
    { label: 'Service Requests', href: '/account/leads',      icon: 'Inbox' },
    { label: 'Portfolio',        href: '/account/portfolio',  icon: 'FolderOpen' },
    { label: 'My Profile',       href: '/account/profile',    icon: 'User' },
    { label: 'Wallet',           href: '/account/wallet',     icon: 'Wallet' },
    NOTIFICATIONS_NAV,
  ],
  architect: [
    { label: 'Dashboard',        href: '/architect',          icon: 'Ruler',      exact: true },
    { label: 'Service Requests', href: '/account/leads',      icon: 'Inbox' },
    { label: 'Portfolio',        href: '/account/portfolio',  icon: 'FolderOpen' },
    { label: 'My Profile',       href: '/account/profile',    icon: 'User' },
    { label: 'Wallet',           href: '/account/wallet',     icon: 'Wallet' },
    NOTIFICATIONS_NAV,
  ],
  lawyer: [
    { label: 'Dashboard',        href: '/lawyer',             icon: 'Scale',      exact: true },
    { label: 'Service Requests', href: '/account/leads',      icon: 'Inbox' },
    { label: 'My Profile',       href: '/account/profile',    icon: 'User' },
    { label: 'Wallet',           href: '/account/wallet',     icon: 'Wallet' },
    NOTIFICATIONS_NAV,
  ],
  tenant: [
    { label: 'Find Rentals', href: '/tenant',              icon: 'Home',    exact: true },
    { label: 'My Requests',  href: '/account/requests',    icon: 'Inbox' },
    { label: 'Browse',       href: '/properties',          icon: 'Search',  exact: true },
    { label: 'My Profile',   href: '/account/profile',     icon: 'User' },
    { label: 'Wallet',       href: '/account/wallet',      icon: 'Wallet' },
    NOTIFICATIONS_NAV,
  ],
  developer: [
    { label: 'Dashboard',   href: '/developer',            icon: 'Building',   exact: true },
    { label: 'My Listings', href: '/seller/listings',      icon: 'Building2' },
    { label: 'New Listing', href: '/seller/listings/new',  icon: 'Plus',       exact: true },
    { label: 'My Requests', href: '/account/requests',     icon: 'Inbox' },
    { label: 'My Profile',  href: '/account/profile',      icon: 'User' },
    { label: 'Wallet',      href: '/account/wallet',       icon: 'Wallet' },
    NOTIFICATIONS_NAV,
  ],
  property_manager: [
    { label: 'Dashboard',   href: '/manager',              icon: 'ClipboardList', exact: true },
    { label: 'Properties',  href: '/seller/listings',      icon: 'Building2' },
    { label: 'My Requests', href: '/account/requests',     icon: 'Inbox' },
    { label: 'My Profile',  href: '/account/profile',      icon: 'User' },
    { label: 'Wallet',      href: '/account/wallet',       icon: 'Wallet' },
    NOTIFICATIONS_NAV,
  ],
  surveyor: [
    { label: 'Dashboard',        href: '/surveyor',           icon: 'Compass',    exact: true },
    { label: 'Service Requests', href: '/account/leads',      icon: 'Inbox' },
    { label: 'Portfolio',        href: '/account/portfolio',  icon: 'FolderOpen' },
    { label: 'My Profile',       href: '/account/profile',    icon: 'User' },
    { label: 'Wallet',           href: '/account/wallet',     icon: 'Wallet' },
    NOTIFICATIONS_NAV,
  ],
  maintenance: [
    { label: 'Dashboard',        href: '/maintenance',        icon: 'Hammer',     exact: true },
    { label: 'Service Requests', href: '/account/leads',      icon: 'Inbox' },
    { label: 'My Profile',       href: '/account/profile',    icon: 'User' },
    { label: 'Wallet',           href: '/account/wallet',     icon: 'Wallet' },
    NOTIFICATIONS_NAV,
  ],
  admin: [
    { label: 'Overview',         href: '/admin',                  icon: 'LayoutDashboard', exact: true },
    { label: 'Users',            href: '/admin/users',            icon: 'Users' },
    { label: 'Properties',       href: '/admin/properties',       icon: 'Building2' },
    { label: 'Professionals',    href: '/admin/professionals',    icon: 'ShieldCheck' },
    { label: 'Verifications',    href: '/admin/verifications',    icon: 'ClipboardList' },
    { label: 'Service Requests', href: '/admin/service-requests', icon: 'Inbox' },
    { label: 'Escrow',           href: '/admin/escrow',           icon: 'Scale' },
    { label: 'Commissions',      href: '/admin/commissions',      icon: 'TrendingUp' },
    { label: 'Reports',          href: '/admin/reports',          icon: 'Flag' },
    { label: 'Billing',          href: '/admin/billing',          icon: 'CreditCard' },
    { label: 'Payouts',          href: '/admin/payouts',          icon: 'Wallet' },
    { label: 'Settings',         href: '/admin/settings',         icon: 'Settings' },
    { label: 'My Profile',       href: '/account/profile',        icon: 'User' },
  ],
}
