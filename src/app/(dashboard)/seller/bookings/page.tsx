import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, CheckCircle, Clock, Plus, XCircle, User } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { respondToBooking } from '@/lib/actions/properties'
import { BookingCalendar } from '@/components/properties/BookingCalendar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/format'
import type { PropertyRow } from '@/types/database'

export const metadata: Metadata = { title: 'Bookings — Seller' }

type ShortTermListing = Pick<PropertyRow, 'id' | 'title' | 'slug' | 'status'>

type BookingRow = {
  id: string
  property_id: string
  renter_id: string
  check_in_date: string
  check_out_date: string
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'no_show'
  notes: string | null
  created_at: string
  profiles: {
    full_name: string | null
    email: string
    phone: string | null
  } | null
}

function expandDateRange(checkIn: string, checkOut: string): string[] {
  const dates: string[] = []
  const start = new Date(checkIn)
  const end   = new Date(checkOut)
  const cur   = new Date(start)
  while (cur < end) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   variant: 'secondary'  as const, icon: Clock },
  confirmed: { label: 'Confirmed', variant: 'default'    as const, icon: CheckCircle },
  active:    { label: 'Active',    variant: 'default'    as const, icon: CheckCircle },
  completed: { label: 'Completed', variant: 'outline'    as const, icon: CheckCircle },
  cancelled: { label: 'Cancelled', variant: 'destructive' as const, icon: XCircle },
  no_show:   { label: 'No Show',   variant: 'destructive' as const, icon: XCircle },
}

export default async function SellerBookingsPage() {
  const profile = await getServerProfile()
  if (!profile || !['seller', 'agent', 'admin'].includes(profile.role)) redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  // Fetch short_term listings owned by this seller
  const { data: listingData } = await supabase
    .from('properties')
    .select('id, title, slug, status')
    .eq('owner_id', profile.id)
    .eq('listing_type', 'short_term')
    .order('created_at', { ascending: false }) as { data: ShortTermListing[] | null }

  const listings = listingData ?? []
  const propIds  = listings.map(l => l.id)

  // Fetch all bookings for those properties (propbook_select RLS: owner_id = auth.uid())
  let bookings: BookingRow[] = []
  if (propIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('property_bookings')
      .select(`
        id, property_id, renter_id, check_in_date, check_out_date,
        status, notes, created_at,
        profiles (full_name, email, phone)
      `)
      .in('property_id', propIds)
      .order('check_in_date', { ascending: true }) as { data: BookingRow[] | null }
    bookings = data ?? []
  }

  // Group bookings by property_id
  const bookingsByProp: Record<string, BookingRow[]> = {}
  for (const b of bookings) {
    if (!bookingsByProp[b.property_id]) bookingsByProp[b.property_id] = []
    bookingsByProp[b.property_id].push(b)
  }

  // For each property, build the set of booked dates (confirmed + active only)
  function getBookedDates(propId: string): string[] {
    const propBookings = bookingsByProp[propId] ?? []
    const dates: string[] = []
    for (const b of propBookings) {
      if (['confirmed', 'active'].includes(b.status)) {
        dates.push(...expandDateRange(b.check_in_date, b.check_out_date))
      }
    }
    return dates
  }

  const pendingTotal = bookings.filter(b => b.status === 'pending').length

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-sm text-muted-foreground">
            {listings.length} short-term {listings.length === 1 ? 'listing' : 'listings'}
            {pendingTotal > 0 && ` · ${pendingTotal} pending request${pendingTotal !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">No short-term listings</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create a listing with type &ldquo;Short Term&rdquo; to manage bookings.
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
        <div className="space-y-10">
          {listings.map((listing) => {
            const propBookings = bookingsByProp[listing.id] ?? []
            const pending      = propBookings.filter(b => b.status === 'pending')
            const bookedDates  = getBookedDates(listing.id)

            return (
              <section key={listing.id} className="space-y-4">
                {/* Listing header */}
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
                  {pending.length > 0 && (
                    <Badge variant="secondary">
                      {pending.length} pending
                    </Badge>
                  )}
                </div>

                {/* Calendar — confirmed/active dates highlighted */}
                <BookingCalendar bookedDates={bookedDates} />

                {/* Booking requests for this property */}
                {propBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No booking requests yet.</p>
                ) : (
                  <div className="rounded-xl border divide-y overflow-hidden">
                    {propBookings.map((booking) => {
                      const cfg  = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending
                      const Icon = cfg.icon
                      const nights = Math.round(
                        (new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) / 86400000
                      )
                      const bookingId = booking.id

                      return (
                        <div key={booking.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 min-w-0">
                              <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {booking.profiles?.full_name ?? 'Guest'}
                                </p>
                                {booking.profiles?.email && (
                                  <a
                                    href={`mailto:${booking.profiles.email}`}
                                    className="text-xs text-primary hover:underline"
                                  >
                                    {booking.profiles.email}
                                  </a>
                                )}
                              </div>
                            </div>
                            <Badge variant={cfg.variant} className="shrink-0 flex items-center gap-1">
                              <Icon className="h-3 w-3" />
                              {cfg.label}
                            </Badge>
                          </div>

                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p>
                              <span className="text-foreground font-medium">{formatDate(booking.check_in_date)}</span>
                              {' → '}
                              <span className="text-foreground font-medium">{formatDate(booking.check_out_date)}</span>
                              <span className="ml-1">({nights} night{nights !== 1 ? 's' : ''})</span>
                            </p>
                            {booking.notes && (
                              <p className="italic line-clamp-2">&ldquo;{booking.notes}&rdquo;</p>
                            )}
                            <p>Requested {formatDate(booking.created_at)}</p>
                          </div>

                          {booking.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <form
                                action={async () => {
                                  'use server'
                                  await respondToBooking(bookingId, 'confirmed')
                                }}
                              >
                                <Button type="submit" size="sm" variant="default">
                                  Confirm
                                </Button>
                              </form>
                              <form
                                action={async () => {
                                  'use server'
                                  await respondToBooking(bookingId, 'cancelled')
                                }}
                              >
                                <Button type="submit" size="sm" variant="outline">
                                  Decline
                                </Button>
                              </form>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
