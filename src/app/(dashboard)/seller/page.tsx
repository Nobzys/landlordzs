import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, Plus, MessageSquare, Wallet, User } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { Badge } from '@/components/ui/badge'
import type { PropertyRow } from '@/types/database'

export const metadata: Metadata = { title: 'Dashboard — Seller' }

const QUICK_ACTIONS = [
  { label: 'New Listing',     href: '/seller/listings/new', icon: Plus },
  { label: 'My Listings',     href: '/seller/listings',     icon: Building2 },
  { label: 'Wallet',          href: '/account/wallet',      icon: Wallet },
  { label: 'My Profile',      href: '/account/profile',     icon: User },
]

const STATUS_LABELS: Record<string, string> = {
  draft:          'Draft',
  pending_review: 'Pending Review',
  active:         'Active',
  under_offer:    'Under Offer',
  sold:           'Sold',
  rented:         'Rented',
  off_market:     'Off Market',
  expired:        'Expired',
  rejected:       'Rejected',
}

const STATUS_ORDER = ['active', 'pending_review', 'draft', 'under_offer', 'off_market', 'sold', 'rented', 'expired', 'rejected']

export default async function SellerHomePage() {
  const profile = await getServerProfile()
  if (!profile || !['seller', 'agent', 'admin'].includes(profile.role)) redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  const { data: listings } = await supabase
    .from('properties')
    .select('id, status, view_count, enquiry_count')
    .eq('owner_id', profile.id) as {
      data: Pick<PropertyRow, 'id' | 'status' | 'view_count' | 'enquiry_count'>[] | null
    }

  const allListings = listings ?? []

  const statusCounts: Record<string, number> = {}
  for (const l of allListings) {
    statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1
  }

  const totalViews     = allListings.reduce((s, l) => s + l.view_count, 0)
  const totalInquiries = allListings.reduce((s, l) => s + l.enquiry_count, 0)
  const activeCount    = statusCounts['active'] ?? 0

  const propIds = allListings.map((l) => l.id)
  let unreadCount = 0
  if (propIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('property_inquiries')
      .select('id', { count: 'exact', head: true })
      .in('property_id', propIds)
      .eq('is_read', false) as { count: number | null }
    unreadCount = count ?? 0
  }

  const displayStatuses = STATUS_ORDER
    .filter((s) => (statusCounts[s] ?? 0) > 0)
    .map((s) => ({ status: s, count: statusCounts[s] }))

  const firstName = profile.full_name?.split(' ')[0]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Your seller dashboard overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold">{allListings.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total listings</p>
        </div>
        <div className="rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold">{activeCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Active</p>
        </div>
        <div className="rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Total views</p>
        </div>
        <div className="rounded-xl border p-4 text-center relative">
          <p className="text-2xl font-bold">{totalInquiries}</p>
          <p className="text-xs text-muted-foreground mt-1">Inquiries</p>
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Unread inquiries shortcut */}
      {unreadCount > 0 && (
        <Link
          href="/seller/inquiries"
          className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 hover:bg-primary/10 transition-colors"
        >
          <MessageSquare className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium">
              {unreadCount} new {unreadCount === 1 ? 'inquiry' : 'inquiries'} waiting
            </p>
            <p className="text-xs text-muted-foreground">Click to review and respond</p>
          </div>
        </Link>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Listings by status */}
      {displayStatuses.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Listings by Status
          </h2>
          <div className="rounded-xl border divide-y overflow-hidden">
            {displayStatuses.map(({ status, count }) => (
              <div key={status} className="flex items-center justify-between p-3">
                <span className="text-sm">{STATUS_LABELS[status] ?? status}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {allListings.length === 0 && (
        <div className="rounded-xl border text-center py-16">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">No listings yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first listing to start selling or renting.
          </p>
          <Link
            href="/seller/listings/new"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="h-4 w-4" />
            Create a listing
          </Link>
        </div>
      )}
    </div>
  )
}
