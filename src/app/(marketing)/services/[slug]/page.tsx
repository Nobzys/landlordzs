import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { ListingPagination } from '@/components/ui/listing-pagination'
import { ServiceListingCard } from '@/components/services/ServiceListingCard'
import type { ServiceListing } from '@/components/services/ServiceListingCard'

// UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PAGE_SIZE = 8

const RATING_OPTIONS = [
  { value: '5', label: '5 stars only'  },
  { value: '4', label: '4 stars & up'  },
  { value: '3', label: '3 stars & up'  },
]

interface PageProps {
  params:       Promise<{ slug: string }>
  searchParams: Promise<{
    city?:      string
    min_price?: string
    max_price?: string
    rating?:    string
    page?:      string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  if (UUID_RE.test(slug)) return { title: 'Service Request — LandLordz' }
  const name = slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  return {
    title: `${name} Services — LandLordz`,
    description: `Find trusted ${name} service providers across Cameroon.`,
  }
}

export default async function ServiceCategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params

  // ── Backward compatibility: old /services/[uuid] → /services/requests/[uuid]
  if (UUID_RE.test(slug)) redirect(`/services/requests/${slug}`)
  // ── Legacy /services/new route
  if (slug === 'new') redirect('/services/requests/new')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  // Resolve category from slug
  const { data: category } = await supabase
    .from('service_categories')
    .select('id, name, description')
    .eq('slug', slug)
    .eq('is_active', true)
    .single() as {
      data: { id: string; name: string; description: string | null } | null
    }

  if (!category) notFound()

  // Parse filter params
  const sp = await searchParams
  const city     = sp.city      || null
  const minPrice = sp.min_price ? Number(sp.min_price) : null
  const maxPrice = sp.max_price ? Number(sp.max_price) : null
  const rating   = sp.rating    ? Number(sp.rating)    : null
  const page     = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const offset   = (page - 1) * PAGE_SIZE

  const hasFilter = !!(city || minPrice || maxPrice || rating)

  // Build service_listings query — JOINs profiles via provider_id FK
  let q = supabase
    .from('service_listings')
    .select(
      `id, title, description, base_price, price_type, service_areas,
       rating_avg, rating_count, booking_count, is_featured,
       profiles(id, full_name, avatar_url, city, is_verified)`,
      { count: 'exact' }
    )
    .eq('category_id', category.id)
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('rating_avg',  { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (city)     q = q.contains('service_areas', [city])
  if (minPrice) q = q.gte('base_price', minPrice)
  if (maxPrice) q = q.lte('base_price', maxPrice)
  if (rating)   q = q.gte('rating_avg', rating)

  const { data: rawListings, count } = await q as {
    data: (Omit<ServiceListing, 'profiles'> & {
      profiles: ServiceListing['profiles'] | ServiceListing['profiles'][]
    })[] | null
    count: number | null
  }

  // Supabase may return profiles as object or single-element array depending on schema introspection
  const listings: ServiceListing[] = (rawListings ?? []).map(l => ({
    ...l,
    profiles: Array.isArray(l.profiles) ? (l.profiles[0] ?? null) : l.profiles,
  }))

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const cityLabel  = city ? (CAMEROON_CITIES.find(c => c.value === city)?.label ?? city) : null

  function buildHref(p: number) {
    const params = new URLSearchParams()
    if (city)     params.set('city',      city)
    if (minPrice) params.set('min_price', String(minPrice))
    if (maxPrice) params.set('max_price', String(maxPrice))
    if (rating)   params.set('rating',    String(rating))
    if (p > 1)    params.set('page',      String(p))
    const qs = params.toString()
    return `/services/${slug}${qs ? `?${qs}` : ''}`
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a0505] via-[#420e0e] to-[#7f1111] py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-3">
          <p className="text-white/60 text-sm">
            <Link href="/services" className="hover:text-white transition-colors">Services</Link>
            {' / '}
            {category.name}
          </p>
          <h1 className="text-3xl font-bold text-white">{category.name}</h1>
          {category.description && (
            <p className="text-white/80 max-w-xl">{category.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <aside className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
            <form method="GET" action={`/services/${slug}`}>
              <div className="p-4 rounded-xl border bg-card space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Filter Providers</span>
                  {hasFilter && (
                    <Link href={`/services/${slug}`} className="text-xs text-[#B71C1C] hover:underline">
                      Reset
                    </Link>
                  )}
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

                {/* Rating */}
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

                {/* Price range */}
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
            </form>

            {/* Post a request CTA */}
            <div className="mt-4 p-4 rounded-xl border bg-card space-y-3">
              <p className="text-sm font-medium">Need {category.name.toLowerCase()}?</p>
              <p className="text-xs text-muted-foreground">
                Post a request and let providers come to you with quotations.
              </p>
              <Link
                href="/services/requests/new"
                className="block w-full text-center rounded-md bg-[#B71C1C] text-white py-2 text-sm font-semibold hover:bg-[#9b1515] transition-colors"
              >
                Post a Request
              </Link>
            </div>
          </aside>

          {/* ── Main content ─────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">
            <p className="text-sm text-muted-foreground">
              {totalCount.toLocaleString()} provider{totalCount !== 1 ? 's' : ''}
              {cityLabel ? ` in ${cityLabel}` : ''}
            </p>

            {listings.length === 0 ? (
              <div className="text-center py-20 border rounded-xl text-muted-foreground">
                <Wrench className="mx-auto h-10 w-10 mb-3 opacity-30" />
                {hasFilter ? (
                  <>
                    <p className="font-medium">No providers match your filters.</p>
                    <p className="text-sm mt-1">Try adjusting or resetting your filters.</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">No providers listed yet for {category.name}.</p>
                    <p className="text-sm mt-1 mb-4">
                      Post a request and professionals will reach out with quotations.
                    </p>
                    <Link
                      href="/services/requests/new"
                      className="inline-flex items-center gap-2 rounded-md bg-[#B71C1C] text-white px-4 py-2 text-sm font-semibold hover:bg-[#9b1515] transition-colors"
                    >
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
