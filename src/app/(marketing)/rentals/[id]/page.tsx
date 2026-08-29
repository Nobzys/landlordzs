import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Package, Truck, MapPin, Calendar, CheckCircle } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { createRentalBooking } from '@/lib/actions/rentals'
import { formatXAF } from '@/lib/utils/format'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'

interface PageProps {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ error?: string; booked?: string }>
}

type RentalDetailRow = {
  id:              string
  owner_id:        string
  name:            string
  type:            string
  condition:       string
  description:     string | null
  make:            string | null
  model_name:      string | null
  year:            number | null
  daily_rate:      number
  weekly_rate:     number | null
  monthly_rate:    number | null
  deposit_amount:  number
  min_rental_days: number
  max_rental_days: number | null
  city:            string | null
  address:         string | null
  images:          string[]
  is_available:    boolean
  rating_avg:      number
  rating_count:    number
  rental_categories: { name: string } | null
}

const CONDITION_LABELS: Record<string, string> = {
  new:       'New',
  excellent: 'Excellent',
  good:      'Good',
  fair:      'Fair',
  poor:      'Poor',
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('rental_listings')
    .select('name, description')
    .eq('id', id)
    .single() as { data: { name: string; description: string | null } | null }

  if (!data) return { title: 'Rental Not Found' }
  return {
    title: `${data.name} — Landlordzs Rentals`,
    description: data.description?.slice(0, 160) ?? `Rent ${data.name} on Landlordzs.`,
  }
}

export default async function RentalDetailPage({ params, searchParams }: PageProps) {
  const { id }                       = await params
  const { error: errorParam, booked } = await searchParams

  const [supabase, profile] = await Promise.all([
    createClient(),
    getServerProfile(),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listing } = await (supabase as any)
    .from('rental_listings')
    .select(`
      id, owner_id, name, type, condition, description,
      make, model_name, year,
      daily_rate, weekly_rate, monthly_rate, deposit_amount,
      min_rental_days, max_rental_days,
      city, address, images, is_available,
      rating_avg, rating_count,
      rental_categories:category_id(name)
    `)
    .eq('id', id)
    .single() as { data: RentalDetailRow | null }

  if (!listing) notFound()

  const cityLabel = listing.city
    ? (CAMEROON_CITIES.find(c => c.value === listing.city)?.label ?? listing.city)
    : null

  const isOwner   = profile?.id === listing.owner_id
  const hasImages = listing.images && listing.images.length > 0

  // Today in YYYY-MM-DD for the date input min attribute
  const todayStr = new Date().toISOString().split('T')[0]

  // Inline server action — closes over `id` for redirect URL construction
  async function bookRental(formData: FormData) {
    'use server'
    const result = await createRentalBooking(formData)
    if (result.error) {
      redirect(`/rentals/${id}?error=${encodeURIComponent(result.error)}`)
    }
    redirect(`/rentals/${id}?booked=1`)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link href="/rentals" className="hover:text-foreground transition-colors">Rentals</Link>
          <span>/</span>
          <span className="text-foreground line-clamp-1">{listing.name}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Left column: image + details ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image placeholder / gallery */}
            <div className="relative aspect-video rounded-xl border bg-muted overflow-hidden flex items-center justify-center">
              {hasImages ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.images[0]}
                  alt={listing.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
                  {listing.type === 'vehicle' ? (
                    <Truck className="h-16 w-16" />
                  ) : (
                    <Package className="h-16 w-16" />
                  )}
                  <p className="text-sm">No photos uploaded</p>
                </div>
              )}
            </div>

            {/* Additional images if any */}
            {listing.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {listing.images.slice(1).map((url, idx) => (
                  <div
                    key={idx}
                    className="relative h-16 w-16 shrink-0 rounded-lg border overflow-hidden bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`${listing.name} ${idx + 2}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Name + badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="capitalize">{listing.type}</Badge>
                <Badge variant="outline">{CONDITION_LABELS[listing.condition] ?? listing.condition}</Badge>
                {listing.rental_categories?.name && (
                  <Badge variant="outline">{listing.rental_categories.name}</Badge>
                )}
                {!listing.is_available && (
                  <Badge variant="destructive">Unavailable</Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold leading-snug">{listing.name}</h1>
              {(listing.make || listing.model_name || listing.year) && (
                <p className="text-muted-foreground text-sm">
                  {[listing.make, listing.model_name, listing.year].filter(Boolean).join(' · ')}
                </p>
              )}
              {cityLabel && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {cityLabel}
                  {listing.address && <span>· {listing.address}</span>}
                </div>
              )}
            </div>

            {/* Rates */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h2 className="font-semibold text-base">Rental Rates</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="text-center rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Daily</p>
                  <p className="font-bold text-base">{formatXAF(listing.daily_rate)}</p>
                </div>
                {listing.weekly_rate && (
                  <div className="text-center rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Weekly</p>
                    <p className="font-bold text-base">{formatXAF(listing.weekly_rate)}</p>
                  </div>
                )}
                {listing.monthly_rate && (
                  <div className="text-center rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Monthly</p>
                    <p className="font-bold text-base">{formatXAF(listing.monthly_rate)}</p>
                  </div>
                )}
              </div>
              <div className="text-sm text-muted-foreground space-y-1 pt-1 border-t">
                {listing.deposit_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Security deposit</span>
                    <span className="font-medium text-foreground">{formatXAF(listing.deposit_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Minimum rental</span>
                  <span className="font-medium text-foreground">
                    {listing.min_rental_days} day{listing.min_rental_days === 1 ? '' : 's'}
                  </span>
                </div>
                {listing.max_rental_days && (
                  <div className="flex justify-between">
                    <span>Maximum rental</span>
                    <span className="font-medium text-foreground">
                      {listing.max_rental_days} days
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <section>
                <h2 className="font-semibold text-base mb-2">Description</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {listing.description}
                </p>
              </section>
            )}
          </div>

          {/* ── Right column: booking form ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* Success banner */}
              {booked === '1' && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 flex items-start gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Booking request sent!</p>
                    <p className="mt-0.5 text-xs opacity-80">
                      The owner will confirm your dates shortly.
                    </p>
                  </div>
                </div>
              )}

              {/* Error banner */}
              {errorParam && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {decodeURIComponent(errorParam)}
                </div>
              )}

              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div>
                  <p className="text-xl font-bold">{formatXAF(listing.daily_rate)}</p>
                  <p className="text-xs text-muted-foreground">per day</p>
                </div>

                {!listing.is_available ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    This listing is currently unavailable.
                  </p>
                ) : isOwner ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    This is your listing.
                  </p>
                ) : !profile ? (
                  <LinkButton
                    href={`/login?redirect=/rentals/${id}`}
                    className="w-full"
                  >
                    Sign in to book
                  </LinkButton>
                ) : booked === '1' ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Want to book again?{' '}
                    <a href={`/rentals/${id}`} className="text-primary hover:underline">
                      Reset form
                    </a>
                  </p>
                ) : (
                  <form action={bookRental} className="space-y-3">
                    <input type="hidden" name="listing_id" value={listing.id} />

                    <div className="space-y-1.5">
                      <label htmlFor="start_date" className="text-sm font-medium flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Start Date <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="start_date"
                        name="start_date"
                        type="date"
                        required
                        min={todayStr}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="end_date" className="text-sm font-medium flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        End Date <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="end_date"
                        name="end_date"
                        type="date"
                        required
                        min={todayStr}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="pickup_notes" className="text-sm font-medium">
                        Notes <span className="text-muted-foreground text-xs">(optional)</span>
                      </label>
                      <textarea
                        id="pickup_notes"
                        name="pickup_notes"
                        rows={2}
                        placeholder="Pickup location, special requirements…"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      />
                    </div>

                    {listing.deposit_amount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        A deposit of {formatXAF(listing.deposit_amount)} is required at pickup.
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Request Booking
                    </button>

                    <p className="text-xs text-muted-foreground text-center">
                      No payment charged now. The owner will confirm your request.
                    </p>
                  </form>
                )}
              </div>

              {/* Min rental notice */}
              {listing.min_rental_days > 1 && listing.is_available && !isOwner && (
                <p className="text-xs text-muted-foreground text-center">
                  Minimum {listing.min_rental_days} days required
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
