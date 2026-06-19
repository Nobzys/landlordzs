import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Plus, Eye, Edit, Trash2, ToggleRight, ShieldCheck, Building2, Heart, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { MetricsGrid } from '@/components/dashboard/MetricsGrid'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { deleteProperty, publishProperty, requestVerification } from '@/lib/actions/properties'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { formatXAFShort, formatDate } from '@/lib/utils/format'
import type { PropertyRow } from '@/types/database'

export const metadata: Metadata = { title: 'My Listings' }

async function getMyListings(): Promise<PropertyRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('properties')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return data ?? []
}

async function getSellerMetrics(userId: string, listings: PropertyRow[]) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const propertyIds = listings.map((p) => p.id)

  const [favoritesRes, messagesRes] = await Promise.all([
    propertyIds.length > 0
      ? sb.from('property_favorites').select('id', { count: 'exact', head: true }).in('property_id', propertyIds)
      : Promise.resolve({ count: 0 }),
    sb.from('conversation_participants').select('conversation_id', { count: 'exact', head: true }).eq('user_id', userId).is('left_at', null),
  ])

  return {
    activeListings: listings.filter((p) => p.status === 'active').length,
    totalViews: listings.reduce((sum, p) => sum + (p.view_count ?? 0), 0),
    favoritesReceived: favoritesRes.count ?? 0,
    messages: messagesRes.count ?? 0,
  }
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft:          { label: 'Draft',        variant: 'secondary' },
  pending_review: { label: 'Pending',      variant: 'outline' },
  active:         { label: 'Active',       variant: 'default' },
  under_offer:    { label: 'Under Offer',  variant: 'outline' },
  sold:           { label: 'Sold',         variant: 'secondary' },
  rented:         { label: 'Rented',       variant: 'secondary' },
  off_market:     { label: 'Off Market',   variant: 'secondary' },
  expired:        { label: 'Expired',      variant: 'secondary' },
  rejected:       { label: 'Rejected',     variant: 'destructive' },
}

export default async function SellerListingsPage() {
  const profile = await getServerProfile()
  if (!profile || !['seller', 'agent', 'admin'].includes(profile.role)) {
    redirect('/login')
  }
  requireActiveProfile(profile)

  const listings = await getMyListings()
  const metrics = await getSellerMetrics(profile.id, listings)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Listings</h1>
          <p className="text-sm text-muted-foreground">{listings.length} total</p>
        </div>
        <LinkButton href="/seller/listings/new">
          <Plus className="h-4 w-4 mr-2" />
          Post Property
        </LinkButton>
      </div>

      <MetricsGrid
        metrics={[
          { icon: Building2, label: 'Active Listings', value: metrics.activeListings },
          { icon: Eye, label: 'Total Views', value: metrics.totalViews },
          { icon: Heart, label: 'Favorites Received', value: metrics.favoritesReceived },
          { icon: MessageSquare, label: 'Messages', value: metrics.messages },
        ]}
      />

      {listings.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="You haven't created any listings yet."
          ctaLabel="Create your first listing"
          ctaHref="/seller/listings/new"
        />
      ) : (
        <div className="space-y-3">
          {listings.map(p => {
            const badge = STATUS_BADGE[p.status] ?? { label: p.status, variant: 'secondary' as const }
            return (
              <div key={p.id} className="flex items-center gap-4 rounded-xl border p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{p.title}</p>
                    <Badge variant={badge.variant} className="shrink-0 text-xs">{badge.label}</Badge>
                    {p.is_verified && <Badge variant="outline" className="shrink-0 text-xs text-blue-700">Verified</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">
                    {p.city} · {formatXAFShort(p.price)} · {formatDate(p.created_at)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.view_count} views · {p.enquiry_count} inquiries
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <LinkButton variant="ghost" size="icon" title="View" href={`/properties/${p.id}`}>
                    <Eye className="h-4 w-4" />
                  </LinkButton>
                  <LinkButton variant="ghost" size="icon" title="Edit" href={`/seller/listings/${p.id}/edit`}>
                    <Edit className="h-4 w-4" />
                  </LinkButton>

                  <form action={async () => {
                    'use server'
                    await publishProperty(p.id, p.status !== 'active')
                  }}>
                    <Button variant="ghost" size="icon" type="submit" title={p.status === 'active' ? 'Unpublish' : 'Publish'}>
                      <ToggleRight className="h-4 w-4" />
                    </Button>
                  </form>

                  {(p.status === 'draft' || p.status === 'rejected') && (
                    <form action={async () => {
                      'use server'
                      await requestVerification(p.id)
                    }}>
                      <Button variant="ghost" size="icon" type="submit" title="Submit for verification" className="text-blue-600 hover:text-blue-700">
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                    </form>
                  )}

                  <form action={async () => {
                    'use server'
                    await deleteProperty(p.id)
                  }}>
                    <Button variant="ghost" size="icon" type="submit" title="Delete" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
