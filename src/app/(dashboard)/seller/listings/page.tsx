import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Eye, Edit, Trash2, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { deleteProperty, publishProperty } from '@/lib/actions/properties'
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

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft:                { label: 'Draft',        variant: 'secondary' },
  active:               { label: 'Active',       variant: 'default' },
  pending_verification: { label: 'Pending',      variant: 'outline' },
  under_offer:          { label: 'Under Offer',  variant: 'outline' },
  sold:                 { label: 'Sold',         variant: 'secondary' },
  rented:               { label: 'Rented',       variant: 'secondary' },
  inactive:             { label: 'Inactive',     variant: 'secondary' },
}

export default async function SellerListingsPage() {
  const profile = await getServerProfile()
  if (!profile || !['seller', 'agent', 'admin'].includes(profile.role)) {
    redirect('/login')
  }
  requireActiveProfile(profile)

  const listings = await getMyListings()

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Listings</h1>
          <p className="text-sm text-muted-foreground">{listings.length} total</p>
        </div>
        <Button asChild>
          <Link href="/seller/listings/new">
            <Plus className="h-4 w-4 mr-2" />
            New Listing
          </Link>
        </Button>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-16 border rounded-xl text-muted-foreground">
          <p className="font-medium mb-1">No listings yet</p>
          <p className="text-sm mb-4">Create your first property listing to start selling or renting.</p>
          <Button asChild>
            <Link href="/seller/listings/new">Create Listing</Link>
          </Button>
        </div>
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
                  <Button asChild variant="ghost" size="icon" title="View">
                    <Link href={`/properties/${p.id}`}><Eye className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon" title="Edit">
                    <Link href={`/seller/listings/${p.id}/edit`}><Edit className="h-4 w-4" /></Link>
                  </Button>

                  <form action={async () => {
                    'use server'
                    await publishProperty(p.id, p.status !== 'active')
                  }}>
                    <Button variant="ghost" size="icon" type="submit" title={p.status === 'active' ? 'Unpublish' : 'Publish'}>
                      <ToggleRight className="h-4 w-4" />
                    </Button>
                  </form>

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
