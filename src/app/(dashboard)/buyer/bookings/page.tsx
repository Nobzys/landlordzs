import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, CheckCircle, Clock, XCircle } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'My Bookings — Buyer' }

type BookingRow = {
  id: string
  check_in_date: string
  check_out_date: string
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'no_show'
  notes: string | null
  created_at: string
  properties: {
    id: string
    title: string
    slug: string
    city: string
  } | null
}

const STATUS_CONFIG: Record<BookingRow['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pending:   { label: 'Pending',   variant: 'secondary',   icon: Clock },
  confirmed: { label: 'Confirmed', variant: 'default',     icon: CheckCircle },
  active:    { label: 'Active',    variant: 'default',     icon: CheckCircle },
  completed: { label: 'Completed', variant: 'outline',     icon: CheckCircle },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
  no_show:   { label: 'No Show',   variant: 'destructive', icon: XCircle },
}

export default async function BuyerBookingsPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('property_bookings')
    .select(`
      id, check_in_date, check_out_date, status, notes, created_at,
      properties (id, title, slug, city)
    `)
    .eq('renter_id', profile.id)
    .order('check_in_date', { ascending: false }) as { data: BookingRow[] | null }

  const bookings = data ?? []

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">My Booking Requests</h1>
          <p className="text-sm text-muted-foreground">
            {bookings.length} {bookings.length === 1 ? 'request' : 'requests'}
          </p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">No booking requests yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Browse short-term rentals and request your dates.
          </p>
          <Link
            href="/properties?listing_type=short_term"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary hover:underline"
          >
            Browse short-term rentals
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border divide-y overflow-hidden">
          {bookings.map((booking) => {
            const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending
            const Icon = cfg.icon
            const nights = Math.round(
              (new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) / 86400000
            )
            return (
              <div key={booking.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {booking.properties ? (
                      <Link
                        href={`/properties/${booking.properties.slug}`}
                        className="text-sm font-semibold hover:underline truncate block"
                      >
                        {booking.properties.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-muted-foreground">Property removed</p>
                    )}
                    {booking.properties?.city && (
                      <p className="text-xs text-muted-foreground capitalize">{booking.properties.city}</p>
                    )}
                  </div>
                  <Badge variant={cfg.variant} className="shrink-0 flex items-center gap-1">
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    <span className="text-foreground font-medium">{formatDate(booking.check_in_date)}</span>
                    {' → '}
                    <span className="text-foreground font-medium">{formatDate(booking.check_out_date)}</span>
                  </span>
                  <span>{nights} night{nights !== 1 ? 's' : ''}</span>
                </div>

                {booking.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2 italic">&ldquo;{booking.notes}&rdquo;</p>
                )}

                <p className="text-[10px] text-muted-foreground">
                  Requested {formatDate(booking.created_at)}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
