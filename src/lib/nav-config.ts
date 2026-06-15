import type { UserRole } from '@/types/auth'

export interface NavItem {
  label: string
  href: string
  icon: string
  exact?: boolean
}

export const ROLE_NAV: Record<UserRole, NavItem[]> = {
  buyer: [
    { label: 'Saved Properties', href: '/buyer/favorites',    icon: 'Heart' },
    { label: 'Browse',           href: '/properties',          icon: 'Search',  exact: true },
    { label: 'My Profile',       href: '/account/profile',     icon: 'User' },
    { label: 'Wallet',           href: '/account/wallet',      icon: 'Wallet' },
  ],
  seller: [
    { label: 'My Listings',  href: '/seller/listings',     icon: 'Building2' },
    { label: 'New Listing',  href: '/seller/listings/new', icon: 'Plus',      exact: true },
    { label: 'My Profile',   href: '/account/profile',     icon: 'User' },
    { label: 'Wallet',       href: '/account/wallet',      icon: 'Wallet' },
  ],
  agent: [
    { label: 'Commissions',  href: '/agent/commissions',   icon: 'TrendingUp' },
    { label: 'My Listings',  href: '/seller/listings',     icon: 'Building2' },
    { label: 'New Listing',  href: '/seller/listings/new', icon: 'Plus',       exact: true },
    { label: 'My Profile',   href: '/account/profile',     icon: 'User' },
    { label: 'Wallet',       href: '/account/wallet',      icon: 'Wallet' },
  ],
  vendor: [
    { label: 'Store Overview', href: '/vendor',          icon: 'Store',  exact: true },
    { label: 'My Profile',     href: '/account/profile', icon: 'User' },
    { label: 'Wallet',         href: '/account/wallet',  icon: 'Wallet' },
  ],
  contractor: [
    { label: 'Dashboard',  href: '/contractor',       icon: 'Briefcase', exact: true },
    { label: 'My Profile', href: '/account/profile',  icon: 'User' },
    { label: 'Wallet',     href: '/account/wallet',   icon: 'Wallet' },
  ],
  engineer: [
    { label: 'Dashboard',  href: '/engineer',         icon: 'Wrench',  exact: true },
    { label: 'My Profile', href: '/account/profile',  icon: 'User' },
    { label: 'Wallet',     href: '/account/wallet',   icon: 'Wallet' },
  ],
  architect: [
    { label: 'Dashboard',  href: '/architect',        icon: 'Ruler', exact: true },
    { label: 'My Profile', href: '/account/profile',  icon: 'User' },
    { label: 'Wallet',     href: '/account/wallet',   icon: 'Wallet' },
  ],
  lawyer: [
    { label: 'Dashboard',  href: '/lawyer',           icon: 'Scale',  exact: true },
    { label: 'My Profile', href: '/account/profile',  icon: 'User' },
    { label: 'Wallet',     href: '/account/wallet',   icon: 'Wallet' },
  ],
  admin: [
    { label: 'Overview',       href: '/admin',                  icon: 'LayoutDashboard', exact: true },
    { label: 'Users',          href: '/admin/users',            icon: 'Users' },
    { label: 'Properties',     href: '/admin/properties',       icon: 'Building2' },
    { label: 'Professionals',  href: '/admin/professionals',    icon: 'ShieldCheck' },
    { label: 'Verifications', href: '/admin/verifications',    icon: 'ClipboardList' },
    { label: 'Escrow',         href: '/admin/escrow',           icon: 'Scale' },
    { label: 'Commissions',    href: '/admin/commissions',      icon: 'TrendingUp' },
    { label: 'Reports',        href: '/admin/reports',          icon: 'Flag' },
    { label: 'Payouts',        href: '/admin/payouts',          icon: 'Wallet' },
    { label: 'Settings',       href: '/admin/settings',         icon: 'Settings' },
    { label: 'My Profile',     href: '/account/profile',        icon: 'User' },
  ],
}
