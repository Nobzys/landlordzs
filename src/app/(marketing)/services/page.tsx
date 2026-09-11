import type { Metadata } from 'next'
import Link from 'next/link'
import { Wrench, ArrowRight, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { ListingPagination } from '@/components/ui/listing-pagination'
import { ServiceListingCard } from '@/components/services/ServiceListingCard'
import { ServicesFilterSidebar } from '@/components/services/ServicesFilterSidebar'
import type { ServiceListing } from '@/components/services/ServiceListingCard'

export const metadata: Metadata = {
  title: 'Home Services — LandLordz',
  description: 'Find trusted service providers across Cameroon — cleaning, plumbing, electrical, security, and more.',
}

const PAGE_SIZE = 8

const RATING_OPTIONS = [
  { value: '5', label: '5 stars only' },
  { value: '4', label: '4 stars & up'  },
  { value: '3', label: '3 stars & up'  },
]

type CategoryRow = {
  id:   string
  name: string
  slug: string
}

interface PageProps {
  searchParams: Promise<{
    category?:  string
    city?:      string
    min_price?: string
    max_price?: string
    rating?:    string
    page?:      string
  }>
}

export default async function ServicesPage({ searchParams }: PageProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  // Fetch categories for the sidebar select
  const { data: categories } = await supabase
    .from('service_categories')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('sort_order') as { data: CategoryRow[] | null }

  const cats = categories ?? []

  // Parse filter params
  const sp        = await searchParams
  const catSlug   = sp.category  || null
  const city      = sp.city      || null
  const minPrice  = sp.min_price ? Number(sp.min_price) : null
  const maxPrice  = sp.max_price ? Number(sp.max_price) : null
  const rating    = sp.rating    ? Number(sp.rating)    : null
  const page      = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const offset    = (page - 1) * PAGE_SIZE

  const hasFilter = !!(catSlug || city || minPrice || maxPrice || rating)

  // Resolve category from slug (avoids extra DB round-trip — use in-memory cats list)
  const selectedCategory = catSlug ? (cats.find(c => c.slug === catSlug) ?? null) : null

  // Build service_listings query — no mandatory category filter (shows all when none selected)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from('service_listings')
    .select(
      `id, title, description, base_price, price_type, service_areas,
       rating_avg, rating_count, booking_count, is_featured,
       profiles(id, full_name, avatar_url, city, is_verified)`,
      { count: 'exact' }
    )
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('rating_avg',  { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (selectedCategory) q = q.eq('category_id', selectedCategory.id)
  if (city)             q = q.contains('service_areas', [city])
  if (minPrice)         q = q.gte('base_price', minPrice)
  if (maxPrice)         q = q.lte('base_price', maxPrice)
  if (rating)           q = q.gte('rating_avg', rating)

  const { data: rawListings, count } = await q as {
    data: (Omit<ServiceListing, 'profiles'> & {
      profiles: ServiceListing['profiles'] | ServiceListing['profiles'][]
    })[] | null
    count: number | null
  }

  // Normalise: Supabase may return profiles as object or single-element array
  const listings: ServiceListing[] = (rawListings ?? []).map(l => ({
    ...l,
    profiles: Array.isArray(l.profiles) ? (l.profiles[0] ?? null) : l.profiles,
  }))

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const cityLabel  = city ? (CAMEROON_CITIES.find(c => c.value === city)?.label ?? city) : null

  function buildHref(p: number) {
    const params = new URLSearchParams()
    if (catSlug)  params.set('category',  catSlug)
    if (city)     params.set('city',      city)
    if (minPrice) params.set('min_price', String(minPrice))
    if (maxPrice) params.set('max_price', String(maxPrice))
    if (rating)   params.set('rating',    String(rating))
    if (p > 1)    params.set('page',      String(p))
    const qs = params.toString()
    return `/services${qs ? `?${qs}` : ''}`
  }

  // Filter form — passed as children to ServicesFilterSidebar (server-rendered)
  const filterForm = (
    <form method="GET" action="/services">
      <div className="p-4 rounded-xl border bg-card space-y-5">

        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">Filter Providers</span>
          {hasFilter && (
            <Link href="/services" className="text-xs text-[#B71C1C] hover:underline">
              Reset
            </Link>
          )}
        </div>

        {/* Service Category */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Service Category
          </p>
          <select
            name="category"
            defaultValue={catSlug ?? ''}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All categories</option>
            {cats.map(c => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Location
          </p>
          <select
            name="city"
            defaultValue={city ?? ''}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All cities</option>
            {CAMEROON_CITIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Minimum Rating */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Minimum Rating
          </p>
          <select
            name="rating"
            defaultValue={rating ? String(rating) : ''}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Any rating</option>
            {RATING_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="border-t" />

        {/* Price Range */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Price Range (XAF)
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              name="min_price"
              placeholder="Min"
              defaultValue={minPrice ?? ''}
              min={0}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="number"
              name="max_price"
              placeholder="Max"
              defaultValue={maxPrice ?? ''}
              min={0}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-[#B71C1C] text-white py-2.5 text-sm font-semibold hover:bg-[#9b1515] transition-colors"
        >
          Apply Filters
        </button>
      </div>

      {/* Post a request CTA (sidebar) */}
      <div className="mt-4 p-4 rounded-xl border bg-card space-y-3">
        <p className="text-sm font-medium">Need a service done?</p>
        <p className="text-xs text-muted-foreground">
          Post a request and let professionals come to you with quotations.
        </p>
        <Link
          href="/services/requests/new"
          className="block w-full text-center rounded-md bg-[#B71C1C] text-white py-2 text-sm font-semibold hover:bg-[#9b1515] transition-colors"
        >
          Post a Request
        </Link>
      </div>
    </form>
  )

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-[#1a0505] py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <h1 className="text-4xl font-bold text-white">
            {selectedCategory ? selectedCategory.name : 'Home Services'}
          </h1>
          <p className="text-white/80 max-w-xl text-lg">
            Find trusted professionals for cleaning, repairs, security, landscaping, and more across Cameroon.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/services/requests/new"
              className="inline-flex items-center gap-2 rounded-md bg-[#B71C1C] hover:bg-[#9b1515] text-white px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Post a Request
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/services/requests"
              className="inline-flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Browse Requests
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

          {/* ── Left sidebar — persistent on desktop, drawer on mobile ── */}
          <ServicesFilterSidebar>
            {filterForm}
          </ServicesFilterSidebar>

          {/* ── Right: listings ── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Result count */}
            <p className="text-sm text-muted-foreground">
              {totalCount.toLocaleString()} provider{totalCount !== 1 ? 's' : ''}
              {selectedCategory ? ` · ${selectedCategory.name}` : ''}
              {cityLabel ? ` · ${cityLabel}` : ''}
            </p>

            {listings.length === 0 ? (
              <div className="text-center py-20 border rounded-xl text-muted-foreground">
                <Wrench className="mx-auto h-10 w-10 mb-3 opacity-30" />
                {hasFilter ? (
                  <>
                    <p className="font-medium">No providers match your filters.</p>
                    <p className="text-sm mt-1">Try adjusting or resetting your filters.</p>
                    <Link
                      href="/services"
                      className="inline-block mt-4 text-sm text-[#B71C1C] hover:underline"
                    >
                      Reset filters
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="font-medium">No service providers listed yet.</p>
                    <p className="text-sm mt-1 mb-4">
                      Post a request and professionals will reach out with quotations.
                    </p>
                    <Link
                      href="/services/requests/new"
                      className="inline-flex items-center gap-2 rounded-md bg-[#B71C1C] text-white px-4 py-2 text-sm font-semibold hover:bg-[#9b1515] transition-colors"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Post a Service Request
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {listings.map(listing => (
                  <ServiceListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}

            <ListingPagination
              currentPage={page}
              totalPages={totalPages}
              buildHref={buildHref}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
