import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, Plus } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { BookingCalendar } from '@/components/properties/BookingCalendar'
import type { PropertyRow } from '@/types/database'

export const metadata: Metadata = { title: 'Bookings — Seller' }

type ShortTermListing = Pick<PropertyRow, 'id' | 'title' | 'slug' | 'status'>

export default async function SellerBookingsPage() {
  const profile = await getServerProfile()
  if (!profile || !['seller', 'agent', 'admin'].includes(profile.role)) redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  const { data } = await supabase
    .from('properties')
    .select('id, title, slug, status')
    .eq('owner_id', profile.id)
    .eq('listing_type', 'short_term')
    .order('created_at', { ascending: false }) as {
      data: ShortTermListing[] | null
    }

  const listings = data ?? []

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Manage availability for your short-term rentals
          </p>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">No short-term listings</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create a listing with type &quot;Short Term&quot; to manage bookings.
          </p>
          <Link
            href="/seller/listings/new"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="h-4 w-4" />
            Create a listing
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Booking data layer pending migration */}
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground bg-muted/30">
            <strong className="text-foreground">Coming soon:</strong> Live booking requests and
            availability sync will appear here once the bookings data layer is enabled. Calendars
            below show placeholders — no dates are blocked yet.
          </div>

          {listings.map((listing) => (
            <section key={listing.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Link
                    href={`/properties/${listing.slug}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {listing.title}
                  </Link>
                  <p className="text-xs text-muted-foreground capitalize">{listing.status}</p>
                </div>
              </div>
              {/* Calendar scaffold — bookedDates empty until property_bookings migration */}
              <BookingCalendar bookedDates={[]} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
