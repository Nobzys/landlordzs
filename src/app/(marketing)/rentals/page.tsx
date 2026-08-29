import type { Metadata } from 'next'
import Link from 'next/link'
import { Package, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatXAF } from '@/lib/utils/format'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Equipment & Vehicle Rental — Landlordzs',
  description:
    'Rent construction equipment, vehicles, and tools from trusted owners across Cameroon.',
}

const PAGE_SIZE = 12

interface PageProps {
  searchParams: Promise<{
    type?:     string
    city?:     string
    category?: string
    page?:     string
  }>
}

type RentalCategoryRow = { id: string; name: string; type: string }

type RentalListingRow = {
  id:             string
  name:           string
  type:           string
  condition:      string
  daily_rate:     number
  weekly_rate:    number | null
  monthly_rate:   number | null
  city:           string | null
  make:           string | null
  model_name:     string | null
  year:           number | null
  images:         string[]
  min_rental_days: number
  rental_categories: { name: string } | null
}

const CONDITION_LABELS: Record<string, string> = {
  new:       'New',
  excellent: 'Excellent',
  good:      'Good',
  fair:      'Fair',
  poor:      'Poor',
}

export default async function RentalsPage({ searchParams }: PageProps) {
  const { type, city, category, page: pageStr } = await searchParams
  const page   = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let listingsQuery = (supabase as any)
    .from('rental_listings')
    .select(
      `id, name, type, condition, daily_rate, weekly_rate, monthly_rate,
       city, make, model_name, year, images, min_rental_days,
       rental_categories:category_id(name)`,
      { count: 'exact' }
    )
    .eq('is_available', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (type)     listingsQuery = listingsQuery.eq('type', type)
  if (city)     listingsQuery = listingsQuery.eq('city', city)
  if (category) listingsQuery = listingsQuery.eq('category_id', category)

  const [catsRes, listingsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('rental_categories')
      .select('id, name, type')
      .eq('is_active', true)
      .order('name') as Promise<{ data: RentalCategoryRow[] | null }>,

    listingsQuery as Promise<{ data: RentalListingRow[] | null; count: number | null }>,
  ])

  const categories = catsRes.data ?? []
  const listings   = listingsRes.data ?? []
  const totalCount = listingsRes.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const cityLabel = city
    ? (CAMEROON_CITIES.find(c => c.value === city)?.label ?? city)
    : null

  function buildHref(overrides: {
    type?:     string | null
    city?:     string | null
    category?: string | null
    page?:     number
  }) {
    const params = new URLSearchParams()
    const nt = 'type'     in overrides ? overrides.type     : type
    const nc = 'city'     in overrides ? overrides.city     : city
    const nk = 'category' in overrides ? overrides.category : category
    const np = overrides.page ?? 1
    if (nt) params.set('type', nt)
    if (nc) params.set('city', nc)
    if (nk) params.set('category', nk)
    if (np > 1) params.set('page', String(np))
    const qs = params.toString()
    return `/rentals${qs ? `?${qs}` : ''}`
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-3">
          <h1 className="text-3xl font-bold text-primary-foreground">
            Equipment &amp; Vehicle Rental
          </h1>
          <p className="text-primary-foreground/80 max-w-xl">
            Construction equipment, vehicles, and tools from trusted owners across Cameroon.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Filters row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Type filter */}
          <div className="flex gap-1.5">
            {[
              { value: null,        label: 'All' },
              { value: 'equipment', label: 'Equipment' },
              { value: 'vehicle',   label: 'Vehicles' },
            ].map(opt => (
              <Link
                key={opt.label}
                href={buildHref({ type: opt.value, category: null, page: 1 })}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  type === opt.value || (!type && opt.value === null)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>

          {/* City filter */}
          <form method="GET" action="/rentals" className="flex items-center gap-2">
            {type     && <input type="hidden" name="type"     value={type} />}
            {category && <input type="hidden" name="category" value={category} />}
            <select
              name="city"
              defaultValue={city ?? ''}
              onChange={undefined}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Cities</option>
              {CAMEROON_CITIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              Filter
            </button>
            {city && (
              <Link href={buildHref({ city: null, page: 1 })} className="text-sm text-muted-foreground hover:text-foreground">
                Clear
              </Link>
            )}
          </form>
        </div>

        {/* Category chips (filtered by selected type) */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Link
              href={buildHref({ category: null, page: 1 })}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                !category
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              All categories
            </Link>
            {categories
              .filter(c => !type || c.type === type)
              .map(cat => (
                <Link
                  key={cat.id}
                  href={buildHref({ category: cat.id, page: 1 })}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    category === cat.id
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
          </div>
        )}

        {/* Result summary */}
        <p className="text-sm text-muted-foreground">
          {totalCount} listing{totalCount !== 1 ? 's' : ''}
          {cityLabel ? ` in ${cityLabel}` : ''}
          {type === 'equipment' ? ' — Equipment' : type === 'vehicle' ? ' — Vehicles' : ''}
        </p>

        {/* Listings grid */}
        {listings.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="mx-auto h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">No listings available right now.</p>
            <p className="text-sm mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {listings.map(listing => {
              const thumbUrl = listing.images?.[0] ?? null
              const condLabel = CONDITION_LABELS[listing.condition] ?? listing.condition
              const locLabel = listing.city
                ? (CAMEROON_CITIES.find(c => c.value === listing.city)?.label ?? listing.city)
                : null

              return (
                <Link
                  key={listing.id}
                  href={`/rentals/${listing.id}`}
                  className="group rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                    {thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl}
                        alt={listing.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground/30">
                        {listing.type === 'vehicle' ? (
                          <Truck className="h-8 w-8" />
                        ) : (
                          <Package className="h-8 w-8" />
                        )}
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="capitalize text-xs">
                        {listing.type}
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-1.5">
                    <p className="font-semibold text-sm line-clamp-2 leading-snug">
                      {listing.name}
                    </p>

                    {(listing.make || listing.year) && (
                      <p className="text-xs text-muted-foreground">
                        {[listing.make, listing.model_name, listing.year].filter(Boolean).join(' · ')}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-primary">
                        {formatXAF(listing.daily_rate)}<span className="font-normal text-muted-foreground text-xs">/day</span>
                      </span>
                      {locLabel && (
                        <span className="text-xs text-muted-foreground truncate">{locLabel}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-xs">{condLabel}</Badge>
                      {listing.rental_categories?.name && (
                        <Badge variant="outline" className="text-xs">
                          {listing.rental_categories.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildHref({ page: page - 1 })}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildHref({ page: page + 1 })}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
