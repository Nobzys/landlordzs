import type { Metadata } from 'next'
import Link from 'next/link'
import { Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { PropertyCard } from '@/components/properties/PropertyCard'
import { ListingPagination } from '@/components/ui/listing-pagination'
import type { PropertyWithImages } from '@/types/property'

export const metadata: Metadata = {
  title: 'Properties — Landlordzs',
  description: 'Browse properties for sale, rent, and shortlet across Cameroon.',
}

const PAGE_SIZE = 8

const PROPERTY_TYPES = [
  { value: 'apartment',        label: 'Apartment' },
  { value: 'villa',            label: 'Villa' },
  { value: 'house',            label: 'House' },
  { value: 'studio',           label: 'Studio' },
  { value: 'duplex',           label: 'Duplex' },
  { value: 'penthouse',        label: 'Penthouse' },
  { value: 'commercial_space', label: 'Commercial' },
  { value: 'office',           label: 'Office' },
  { value: 'land',             label: 'Land' },
  { value: 'shop',             label: 'Shop' },
  { value: 'warehouse',        label: 'Warehouse' },
  { value: 'farm',             label: 'Farm' },
  { value: 'hotel',            label: 'Hotel' },
]

const SORT_OPTIONS = [
  { value: 'newest',      label: 'Newest first' },
  { value: 'oldest',      label: 'Oldest first' },
  { value: 'price_asc',   label: 'Price: Low to High' },
  { value: 'price_desc',  label: 'Price: High to Low' },
  { value: 'most_viewed', label: 'Most Viewed' },
]

const LISTING_TYPES = [
  { value: '',           label: 'All types' },
  { value: 'sale',       label: 'For Sale' },
  { value: 'rent',       label: 'For Rent' },
  { value: 'short_term', label: 'Shortlet' },
]

const BEDROOM_OPTS = [
  { value: '',  label: 'Any' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5+' },
]

const FEATURES = [
  { name: 'is_furnished',  label: 'Furnished' },
  { name: 'is_negotiable', label: 'Price Negotiable' },
  { name: 'has_security',  label: '24h Security' },
  { name: 'has_generator', label: 'Generator' },
  { name: 'is_verified',   label: 'Verified Only' },
]

interface PageProps {
  searchParams: Promise<{
    listing_type?: string
    property_type?: string
    city?:          string
    sort?:          string
    min_price?:     string
    max_price?:     string
    bedrooms?:      string
    search?:        string
    is_furnished?:  string
    is_negotiable?: string
    has_security?:  string
    has_generator?: string
    is_verified?:   string
    page?:          string
  }>
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  const sp = await searchParams

  const page   = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  // Parse filter values from URL
  const listingType  = sp.listing_type  || null
  const propertyType = sp.property_type || null
  const city         = sp.city          || null
  const sort         = sp.sort          || 'newest'
  const minPrice     = sp.min_price     ? Number(sp.min_price)  : null
  const maxPrice     = sp.max_price     ? Number(sp.max_price)  : null
  const bedrooms     = sp.bedrooms      ? Number(sp.bedrooms)   : null
  const search       = sp.search?.trim()                         || null

  // Boolean feature flags — present in URL as "1"
  const isFurnished  = sp.is_furnished  === '1'
  const isNegotiable = sp.is_negotiable === '1'
  const hasSecurity  = sp.has_security  === '1'
  const hasGenerator = sp.has_generator === '1'
  const isVerified   = sp.is_verified   === '1'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  let q = supabase
    .from('properties')
    .select('*, property_images(*)', { count: 'exact' })
    .eq('status', 'active')
    .range(offset, offset + PAGE_SIZE - 1)

  if (listingType)  q = q.eq('listing_type',  listingType)
  if (propertyType) q = q.eq('property_type', propertyType)
  if (city)         q = q.eq('city',          city)
  if (minPrice)     q = q.gte('price',         minPrice)
  if (maxPrice)     q = q.lte('price',         maxPrice)
  if (bedrooms)     q = q.gte('bedrooms',      bedrooms)
  if (search)       q = q.ilike('title',       `%${search}%`)
  if (isFurnished)  q = q.eq('is_furnished',   true)
  if (isNegotiable) q = q.eq('is_negotiable',  true)
  if (hasSecurity)  q = q.eq('has_security',   true)
  if (hasGenerator) q = q.eq('has_generator',  true)
  if (isVerified)   q = q.eq('is_verified',    true)

  switch (sort) {
    case 'oldest':      q = q.order('created_at', { ascending: true });  break
    case 'price_asc':   q = q.order('price',      { ascending: true });   break
    case 'price_desc':  q = q.order('price',      { ascending: false });  break
    case 'most_viewed': q = q.order('view_count', { ascending: false });  break
    default:            q = q.order('created_at', { ascending: false });
  }

  const { data, count } = await q as { data: PropertyWithImages[] | null; count: number | null }

  const properties = data ?? []
  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const hasFilter = !!(
    listingType || propertyType || city ||
    (sort && sort !== 'newest') ||
    minPrice || maxPrice || bedrooms || search ||
    isFurnished || isNegotiable || hasSecurity || hasGenerator || isVerified
  )

  const cityLabel = city
    ? (CAMEROON_CITIES.find(c => c.value === city)?.label ?? city)
    : null

  function buildHref(p: number) {
    const params = new URLSearchParams()
    if (listingType)               params.set('listing_type',  listingType)
    if (propertyType)              params.set('property_type', propertyType)
    if (city)                      params.set('city',          city)
    if (sort && sort !== 'newest') params.set('sort',          sort)
    if (minPrice)                  params.set('min_price',     String(minPrice))
    if (maxPrice)                  params.set('max_price',     String(maxPrice))
    if (bedrooms)                  params.set('bedrooms',      String(bedrooms))
    if (search)                    params.set('search',        search)
    if (isFurnished)               params.set('is_furnished',  '1')
    if (isNegotiable)              params.set('is_negotiable', '1')
    if (hasSecurity)               params.set('has_security',  '1')
    if (hasGenerator)              params.set('has_generator', '1')
    if (isVerified)                params.set('is_verified',   '1')
    if (p > 1)                     params.set('page',          String(p))
    const qs = params.toString()
    return `/properties${qs ? `?${qs}` : ''}`
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a0505] via-[#420e0e] to-[#7f1111] py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white">Find Your Property</h1>
          <p className="text-white/80 mt-2 max-w-xl">
            Browse properties for sale, rent, and shortlet across Cameroon.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <aside className="w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
            <form method="GET" action="/properties">
              <div className="p-4 rounded-xl border bg-card space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Search Filters</span>
                  {hasFilter && (
                    <Link
                      href="/properties"
                      className="text-xs text-[#B71C1C] hover:underline"
                    >
                      Reset
                    </Link>
                  )}
                </div>

                {/* Keyword search */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Search
                  </p>
                  <input
                    type="text"
                    name="search"
                    defaultValue={search ?? ''}
                    placeholder="Title, neighborhood…"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* Listing type */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Listing Type
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {LISTING_TYPES.map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="listing_type"
                          value={opt.value}
                          defaultChecked={
                            opt.value === '' ? !listingType : listingType === opt.value
                          }
                          className="accent-[#B71C1C]"
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
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

                {/* Sort */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sort By
                  </p>
                  <select
                    name="sort"
                    defaultValue={sort}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {SORT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="border-t" />

                {/* Property type */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Property Type
                  </p>
                  <select
                    name="property_type"
                    defaultValue={propertyType ?? ''}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Any type</option>
                    {PROPERTY_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

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

                {/* Bedrooms */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Bedrooms (min)
                  </p>
                  <select
                    name="bedrooms"
                    defaultValue={bedrooms ? String(bedrooms) : ''}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {BEDROOM_OPTS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Features
                  </p>
                  {FEATURES.map(({ name, label }) => {
                    const checked = sp[name as keyof typeof sp] === '1'
                    return (
                      <label key={name} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name={name}
                          value="1"
                          defaultChecked={checked}
                          className="accent-[#B71C1C]"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    )
                  })}
                </div>

                {/* Apply */}
                <button
                  type="submit"
                  className="w-full rounded-md bg-[#B71C1C] text-white py-2.5 text-sm font-semibold hover:bg-[#9b1515] transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </form>
          </aside>

          {/* ── Main content ─────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Result summary */}
            <p className="text-sm text-muted-foreground">
              {totalCount.toLocaleString()} propert{totalCount === 1 ? 'y' : 'ies'} found
              {cityLabel ? ` in ${cityLabel}` : ''}
            </p>

            {/* Grid or empty state */}
            {properties.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Home className="mx-auto h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">No properties match your filters.</p>
                <p className="text-sm mt-1">Try adjusting or resetting your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {properties.map(property => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}

            {/* Pagination */}
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
