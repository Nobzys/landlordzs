import type { Metadata } from 'next'
import Link from 'next/link'
import { Package, Truck, ShieldCheck, Clock, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatXAF } from '@/lib/utils/format'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { ListingPagination } from '@/components/ui/listing-pagination'
import { ServicesFilterSidebar } from '@/components/services/ServicesFilterSidebar'

export const metadata: Metadata = {
  title: 'Equipment & Vehicle Rental — Landlordzs',
  description:
    'Rent construction equipment, vehicles, and tools from trusted owners across Cameroon.',
}

const PAGE_SIZE = 9

interface PageProps {
  searchParams: Promise<{
    type?:           string
    city?:           string
    category?:       string
    price_min?:      string
    price_max?:      string
    condition?:      string
    page?:           string
    // Equipment-specific filter
    with_operator?:  string
    // Vehicle-specific filters
    with_driver?:    string
    has_ac?:         string
    has_gps?:        string
    has_child_seat?: string
    fuel_type?:      string
  }>
}

type RentalCategoryRow = { id: string; name: string; type: string }

type RentalListingRow = {
  id:                string
  name:              string
  type:              string
  condition:         string
  daily_rate:        number
  weekly_rate:       number | null
  monthly_rate:      number | null
  city:              string | null
  make:              string | null
  model_name:        string | null
  year:              number | null
  images:            string[]
  min_rental_days:   number
  is_featured:       boolean
  rental_categories: { name: string } | null
}

const CONDITION_LABELS: Record<string, string> = {
  new:       'New',
  excellent: 'Excellent',
  good:      'Good',
  fair:      'Fair',
  poor:      'Poor',
}

const SELECT_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const INPUT_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

export default async function RentalsPage({ searchParams }: PageProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const sp        = await searchParams
  const type      = sp.type      || null
  const city      = sp.city      || null
  const category  = sp.category  || null
  const priceMin  = sp.price_min  ? Number(sp.price_min)  : null
  const priceMax  = sp.price_max  ? Number(sp.price_max)  : null
  const condition = sp.condition  || null
  const page      = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const offset    = (page - 1) * PAGE_SIZE

  // Type-specific filter params — only applied when the matching type is active
  const withOperator = sp.with_operator  === 'true'
  const withDriver   = sp.with_driver    === 'true'
  const hasAC        = sp.has_ac         === 'true'
  const hasGPS       = sp.has_gps        === 'true'
  const hasChildSeat = sp.has_child_seat === 'true'
  const fuelType     = sp.fuel_type      || null

  const hasFilter = !!(
    type || city || category || priceMin || priceMax || condition
    || (type === 'equipment' && withOperator)
    || (type === 'vehicle'   && (withDriver || hasAC || hasGPS || hasChildSeat || fuelType))
  )

  const [catsRes, listingsRes] = await Promise.all([
    supabase
      .from('rental_categories')
      .select('id, name, type')
      .eq('is_active', true)
      .order('name') as Promise<{ data: RentalCategoryRow[] | null }>,

    (() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from('rental_listings')
        .select(
          `id, name, type, condition, daily_rate, weekly_rate, monthly_rate,
           city, make, model_name, year, images, min_rental_days, is_featured,
           rental_categories:category_id(name)`,
          { count: 'exact' }
        )
        .eq('is_available', true)
        .order('is_featured', { ascending: false })
        .order('created_at',  { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (type)      q = q.eq('type',       type)
      if (city)      q = q.eq('city',       city)
      if (category)  q = q.eq('category_id', category)
      if (priceMin)  q = q.gte('daily_rate', priceMin)
      if (priceMax)  q = q.lte('daily_rate', priceMax)
      if (condition) q = q.eq('condition',  condition)

      // Type-specific filters — only applied when the relevant type is active
      if (type === 'equipment' && withOperator) q = q.eq('with_operator',  true)
      if (type === 'vehicle'   && withDriver)   q = q.eq('with_driver',    true)
      if (type === 'vehicle'   && hasAC)        q = q.eq('has_ac',         true)
      if (type === 'vehicle'   && hasGPS)       q = q.eq('has_gps',        true)
      if (type === 'vehicle'   && hasChildSeat) q = q.eq('has_child_seat', true)
      if (type === 'vehicle'   && fuelType)     q = q.eq('fuel_type',      fuelType)

      return q
    })() as Promise<{ data: RentalListingRow[] | null; count: number | null }>,
  ])

  const categories = catsRes.data ?? []
  const listings   = listingsRes.data ?? []
  const totalCount = listingsRes.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const visibleCategories = categories.filter(c => !type || c.type === type)
  const cityLabel  = city ? (CAMEROON_CITIES.find(c => c.value === city)?.label ?? city) : null

  // Type-aware content
  const isEquipment = type === 'equipment'
  const isVehicle   = type === 'vehicle'
  const heroTitle   = isEquipment
    ? 'Equipment Rentals'
    : isVehicle
    ? 'Vehicle Rentals'
    : 'Equipment & Vehicle Rental'
  const heroSub = isEquipment
    ? 'Construction machinery, generators, tools, and heavy equipment from verified owners across Cameroon.'
    : isVehicle
    ? 'Cars, SUVs, pickups, and luxury vehicles available for daily, weekly, or monthly hire.'
    : 'Construction equipment, vehicles, and tools from trusted owners across Cameroon.'
  const ctaLabel  = isVehicle ? 'List Your Vehicle' : 'List Your Equipment'
  const baseHref  = type ? `/rentals?type=${type}` : '/rentals'

  const rangeStart = totalCount === 0 ? 0 : offset + 1
  const rangeEnd   = Math.min(offset + PAGE_SIZE, totalCount)

  function buildPaginationHref(p: number): string {
    const params = new URLSearchParams()
    if (type)      params.set('type',      type)
    if (city)      params.set('city',      city)
    if (category)  params.set('category',  category)
    if (priceMin)  params.set('price_min', String(priceMin))
    if (priceMax)  params.set('price_max', String(priceMax))
    if (condition) params.set('condition', condition)
    // Type-specific filters — preserved across pages only when the matching type is active
    if (type === 'equipment' && withOperator) params.set('with_operator', 'true')
    if (type === 'vehicle') {
      if (withDriver)   params.set('with_driver',    'true')
      if (hasAC)        params.set('has_ac',         'true')
      if (hasGPS)       params.set('has_gps',        'true')
      if (hasChildSeat) params.set('has_child_seat', 'true')
      if (fuelType)     params.set('fuel_type',      fuelType)
    }
    if (p > 1)     params.set('page',      String(p))
    const qs = params.toString()
    return `/rentals${qs ? `?${qs}` : ''}`
  }

  const filterForm = (
    <form method="GET" action="/rentals">
      <div className="p-4 rounded-xl border bg-card space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">Search Filters</span>
          <Link
            href="/rentals"
            className={`text-xs font-medium transition-colors ${
              hasFilter
                ? 'text-[#B71C1C] hover:underline'
                : 'text-muted-foreground/40 pointer-events-none select-none'
            }`}
            aria-disabled={!hasFilter}
            tabIndex={hasFilter ? undefined : -1}
          >
            Reset
          </Link>
        </div>

        {/* Rental Type */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Rental Type
          </p>
          <select name="type" defaultValue={type ?? ''} className={SELECT_CLASS}>
            <option value="">All Rentals</option>
            <option value="equipment">Equipment</option>
            <option value="vehicle">Vehicles</option>
          </select>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Category
          </p>
          <select name="category" defaultValue={category ?? ''} className={SELECT_CLASS}>
            <option value="">All Categories</option>
            {visibleCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Location
          </p>
          <select name="city" defaultValue={city ?? ''} className={SELECT_CLASS}>
            <option value="">All Cities</option>
            {CAMEROON_CITIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="border-t" />

        {/* Price Range Per Day */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Price Per Day (XAF)
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              name="price_min"
              placeholder="Min"
              defaultValue={priceMin ?? ''}
              min={0}
              className={INPUT_CLASS}
            />
            <input
              type="number"
              name="price_max"
              placeholder="Max"
              defaultValue={priceMax ?? ''}
              min={0}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {/* Condition */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Condition
          </p>
          <select name="condition" defaultValue={condition ?? ''} className={SELECT_CLASS}>
            <option value="">Any Condition</option>
            <option value="new">New</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
          </select>
        </div>

        {/* ── Equipment-specific filters ─────────────────────────────── */}
        {isEquipment && (
          <>
            <div className="border-t" />
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Equipment Options
              </p>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="with_operator"
                  value="true"
                  defaultChecked={withOperator}
                  className="h-4 w-4 rounded border-input accent-[#B71C1C]"
                />
                <span className="text-sm">Operator included</span>
              </label>
            </div>
          </>
        )}

        {/* ── Vehicle-specific filters ───────────────────────────────── */}
        {isVehicle && (
          <>
            <div className="border-t" />
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Vehicle Features
              </p>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="with_driver"
                  value="true"
                  defaultChecked={withDriver}
                  className="h-4 w-4 rounded border-input accent-[#B71C1C]"
                />
                <span className="text-sm">Driver included</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="has_ac"
                  value="true"
                  defaultChecked={hasAC}
                  className="h-4 w-4 rounded border-input accent-[#B71C1C]"
                />
                <span className="text-sm">Air conditioning</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="has_gps"
                  value="true"
                  defaultChecked={hasGPS}
                  className="h-4 w-4 rounded border-input accent-[#B71C1C]"
                />
                <span className="text-sm">GPS tracker</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="has_child_seat"
                  value="true"
                  defaultChecked={hasChildSeat}
                  className="h-4 w-4 rounded border-input accent-[#B71C1C]"
                />
                <span className="text-sm">Child seat available</span>
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Fuel Type
              </p>
              <select name="fuel_type" defaultValue={fuelType ?? ''} className={SELECT_CLASS}>
                <option value="">Any Fuel Type</option>
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="electric">Electric</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-[#B71C1C] text-white py-2.5 text-sm font-semibold hover:bg-[#9b1515] transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </form>
  )

  return (
    <main className="min-h-screen bg-background">

      {/* ── Hero ── */}
      <div className="bg-[#1a0505] py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <h1 className="text-4xl font-bold text-white">{heroTitle}</h1>
          <p className="text-white/80 max-w-xl text-lg">{heroSub}</p>
          <Link
            href="/account"
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-0 items-start">

          {/* Sidebar */}
          <ServicesFilterSidebar title="Search Filters" asideClassName="max-h-[560px]">
            {filterForm}
          </ServicesFilterSidebar>

          {/* Vertical divider — desktop only */}
          <div className="hidden lg:block w-px bg-border self-stretch mx-6 shrink-0" aria-hidden="true" />

          {/* Results */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Result count */}
            <p className="text-sm text-muted-foreground">
              {totalCount === 0
                ? 'No listings found'
                : `Showing ${rangeStart}–${rangeEnd} of ${totalCount.toLocaleString()} listing${totalCount !== 1 ? 's' : ''}`}
              {cityLabel   ? ` · ${cityLabel}`    : ''}
              {isEquipment ? ' · Equipment'        : isVehicle ? ' · Vehicles' : ''}
            </p>

            {/* Listings grid */}
            {listings.length === 0 ? (
              <div className="text-center py-20 border rounded-xl text-muted-foreground">
                {isVehicle
                  ? <Truck   className="mx-auto h-10 w-10 mb-3 opacity-30" />
                  : <Package className="mx-auto h-10 w-10 mb-3 opacity-30" />}
                {hasFilter ? (
                  <>
                    <p className="font-medium">No listings match your filters.</p>
                    <p className="text-sm mt-1">Try adjusting or resetting your filters.</p>
                    <Link
                      href={baseHref}
                      className="inline-block mt-4 text-sm text-[#B71C1C] hover:underline"
                    >
                      Reset filters
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="font-medium">No rentals available right now.</p>
                    <p className="text-sm mt-1">Be the first to list your equipment or vehicle.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {listings.map(listing => {
                  const thumbUrl  = listing.images?.[0] ?? null
                  const condLabel = CONDITION_LABELS[listing.condition] ?? listing.condition
                  const locLabel  = listing.city
                    ? (CAMEROON_CITIES.find(c => c.value === listing.city)?.label ?? listing.city)
                    : null

                  return (
                    <div
                      key={listing.id}
                      className="rounded-xl border bg-card overflow-hidden hover:border-[#B71C1C]/40 transition-colors flex flex-col"
                    >
                      {/* Image */}
                      <Link
                        href={`/rentals/${listing.id}`}
                        className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden block shrink-0"
                      >
                        {thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbUrl}
                            alt={listing.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground/30">
                            {listing.type === 'vehicle'
                              ? <Truck   className="h-8 w-8" />
                              : <Package className="h-8 w-8" />}
                          </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex gap-1.5">
                          {listing.is_featured && (
                            <span className="rounded-full bg-amber-500 text-white text-[11px] font-semibold px-2 py-0.5">
                              Featured
                            </span>
                          )}
                          <span className="rounded-full bg-secondary text-secondary-foreground text-[11px] font-medium px-2 py-0.5 capitalize">
                            {listing.type}
                          </span>
                        </div>
                      </Link>

                      {/* Card body */}
                      <div className="p-4 flex flex-col flex-1 gap-2">

                        <Link href={`/rentals/${listing.id}`}>
                          <h2 className="font-semibold text-sm leading-snug line-clamp-2 hover:text-[#B71C1C] transition-colors">
                            {listing.name}
                          </h2>
                        </Link>

                        {(listing.make || listing.year) && (
                          <p className="text-xs text-muted-foreground">
                            {[listing.make, listing.model_name, listing.year]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}

                        {/* Price + location */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base font-bold text-[#B71C1C]">
                            {formatXAF(listing.daily_rate)}
                            <span className="text-xs font-normal text-muted-foreground">/day</span>
                          </span>
                          {locLabel && (
                            <span className="text-xs text-muted-foreground truncate">{locLabel}</span>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            {condLabel}
                          </span>
                          {listing.rental_categories?.name && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {listing.rental_categories.name}
                            </span>
                          )}
                          {listing.min_rental_days > 1 && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              Min {listing.min_rental_days}d
                            </span>
                          )}
                        </div>

                        {/* Actions — pushed to bottom of flex-col */}
                        <div className="mt-auto pt-3 border-t flex gap-2">
                          <Link
                            href={`/rentals/${listing.id}`}
                            className="flex-1 text-center rounded-md bg-[#B71C1C] text-white py-2 text-sm font-semibold hover:bg-[#9b1515] transition-colors"
                          >
                            Book Now
                          </Link>
                          <Link
                            href={`/login?redirect=/rentals/${listing.id}`}
                            className="flex-1 inline-flex items-center justify-center rounded-md border py-2 text-sm font-medium hover:bg-muted transition-colors"
                          >
                            Get Quote
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            <ListingPagination
              currentPage={page}
              totalPages={totalPages}
              buildHref={buildPaginationHref}
            />
          </div>
        </div>
      </div>

      {/* ── Benefits ── */}
      <div className="border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-xl font-bold mb-8 text-center">Why Rent with Landlordzs?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {([
              {
                icon: ShieldCheck,
                title: 'Verified Owners',
                desc: 'All listing owners are identity-verified before they can publish equipment or vehicles.',
              },
              {
                icon: Clock,
                title: 'Flexible Durations',
                desc: 'Daily, weekly, and monthly rates available. Minimum rental periods are clearly stated on every listing.',
              },
              {
                icon: Star,
                title: 'Nationwide Coverage',
                desc: 'Listings across Douala, Yaoundé, Bafoussam, Buea, and all major Cameroon cities.',
              },
            ] as const).map(b => (
              <div key={b.title} className="text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-[#B71C1C]/10 text-[#B71C1C] flex items-center justify-center">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </main>
  )
}
