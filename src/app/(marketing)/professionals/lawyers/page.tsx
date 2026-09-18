import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Star, MapPin, Briefcase, Users, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { ListingPagination } from '@/components/ui/listing-pagination'
import { ServicesFilterSidebar } from '@/components/services/ServicesFilterSidebar'
import { LawyerRatingWidget } from '@/components/lawyers/LawyerRatingWidget'

export const metadata: Metadata = {
  title: 'Property Lawyers — Landlordzs',
  description:
    'Find verified property lawyers across Cameroon for conveyancing, land disputes, title deeds, and commercial leases.',
}

const PAGE_SIZE = 8

const SPECIALIZATIONS = [
  { value: 'conveyancing',      label: 'Conveyancing'       },
  { value: 'property-disputes', label: 'Property Disputes'  },
  { value: 'title-deeds',       label: 'Title Deeds'        },
  { value: 'commercial-leases', label: 'Commercial Leases'  },
  { value: 'land-acquisition',  label: 'Land Acquisition'   },
  { value: 'estate-planning',   label: 'Estate Planning'    },
  { value: 'contract-review',   label: 'Contract Review'    },
]

interface PageProps {
  searchParams: Promise<{
    city?:           string
    rating?:         string
    availability?:   string
    verified?:       string
    specialization?: string
    page?:           string
  }>
}

type LawyerRow = {
  id:                  string
  specializations:     string[]
  service_areas:       string[]
  rating_avg:          number | null
  rating_count:        number | null
  is_available:        boolean
  is_verified:         boolean
  is_featured:         boolean
  experience_years:    number | null
  bio:                 string | null
  hourly_rate:         number | null
  day_rate:            number | null
  availability_status: string | null
  profiles: {
    full_name:  string | null
    avatar_url: string | null
    city:       string | null
  } | null
}

type StatsRow = {
  rating_avg:    number | null
  service_areas: string[]
}

// ── Shared control classes ──────────────────────────────────────────────────
const selectCls = [
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px]',
  'text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#B71C1C]/40',
  'appearance-none cursor-pointer',
].join(' ')

const sectionHdr = 'text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-3'

const checkRow   = 'flex items-center gap-2.5 select-none cursor-pointer group'
const checkBox   = [
  'h-[15px] w-[15px] shrink-0 rounded border-gray-300 accent-[#B71C1C]',
  'cursor-pointer',
].join(' ')
const checkLabel = 'text-[13px] text-gray-700 group-hover:text-gray-900 transition-colors leading-tight'

export default async function PropertyLawyersPage({ searchParams }: PageProps) {
  const {
    city, rating, availability, verified, specialization, page: pageStr,
  } = await searchParams

  const page   = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  // ── Lawyers query (filtered + paginated) ───────────────────────────────────
  let query = supabase
    .from('professional_profiles')
    .select(
      `id, specializations, service_areas, rating_avg, rating_count,
       is_available, is_verified, is_featured, experience_years, bio, hourly_rate, day_rate,
       availability_status, profiles(full_name, avatar_url, city)`,
      { count: 'exact' },
    )
    .eq('profession_type', 'lawyer')
    .order('is_featured',  { ascending: false })
    .order('is_verified',  { ascending: false })
    .order('rating_avg',   { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (city)           query = query.contains('service_areas',   [city])
  if (specialization) query = query.contains('specializations', [specialization])
  if (verified === '1') query = query.eq('is_verified', true)
  if (rating) {
    const min = parseFloat(rating)
    if (!isNaN(min)) query = query.gte('rating_avg', min)
  }
  if (availability === 'now') {
    query = query.eq('availability_status', 'now')
  } else if (availability === 'week') {
    query = query.in('availability_status', ['now', 'week'])
  } else if (availability === 'month') {
    query = query.in('availability_status', ['now', 'week', 'month'])
  }

  // ── Stats query (unfiltered totals) ────────────────────────────────────────
  const [lawyersRes, statsRes] = await Promise.all([
    query as Promise<{ data: LawyerRow[] | null; count: number | null }>,
    supabase
      .from('professional_profiles')
      .select('rating_avg, service_areas')
      .eq('profession_type', 'lawyer') as Promise<{ data: StatsRow[] | null }>,
  ])

  const lawyers     = lawyersRes.data ?? []
  const totalCount  = lawyersRes.count ?? 0
  const totalPages  = Math.ceil(totalCount / PAGE_SIZE)

  const allLawyers    = statsRes.data ?? []
  const totalLawyers  = allLawyers.length
  const ratedLawyers  = allLawyers.filter(l => l.rating_avg !== null && l.rating_avg > 0)
  const avgRating     = ratedLawyers.length > 0
    ? ratedLawyers.reduce((s, l) => s + (l.rating_avg ?? 0), 0) / ratedLawyers.length
    : null
  const citiesSet     = new Set<string>()
  allLawyers.forEach(l => (l.service_areas ?? []).forEach(c => citiesSet.add(c)))
  const citiesCovered = citiesSet.size

  const hasFilters = !!(city || rating || availability || verified || specialization)

  // ── Pagination URL builder ─────────────────────────────────────────────────
  function buildHref(p: number) {
    const params = new URLSearchParams()
    if (city)           params.set('city',           city)
    if (rating)         params.set('rating',         rating)
    if (availability)   params.set('availability',   availability)
    if (verified)       params.set('verified',       verified)
    if (specialization) params.set('specialization', specialization)
    if (p > 1)          params.set('page',           String(p))
    const qs = params.toString()
    return `/professionals/lawyers${qs ? `?${qs}` : ''}`
  }

  // ── Filter sidebar form ────────────────────────────────────────────────────
  const filterForm = (
    <form method="GET" action="/professionals/lawyers">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 bg-gray-50/80">
          <span className="font-semibold text-[13px] text-gray-800">Filter Lawyers</span>
          {hasFilters && (
            <Link
              href="/professionals/lawyers"
              className="text-[12px] text-[#B71C1C] hover:underline font-medium"
            >
              Reset
            </Link>
          )}
        </div>

        <div className="divide-y divide-gray-100">

          {/* Location */}
          <div className="px-4 py-4">
            <p className={sectionHdr}>Location</p>
            <div className="relative">
              <select name="city" defaultValue={city ?? ''} className={selectCls}>
                <option value="">All Cities</option>
                {CAMEROON_CITIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {/* Chevron */}
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">▼</span>
            </div>
          </div>

          {/* Rating */}
          <div className="px-4 py-4">
            <p className={sectionHdr}>Rating</p>
            <div className="space-y-2.5">
              {[
                { value: '5', label: '5 Stars Only' },
                { value: '4', label: '4+ Stars'     },
                { value: '3', label: '3+ Stars'     },
              ].map(r => (
                <label key={r.value} className={checkRow}>
                  <input
                    type="radio"
                    name="rating"
                    value={r.value}
                    defaultChecked={rating === r.value}
                    className={checkBox}
                  />
                  <span className={checkLabel}>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="px-4 py-4">
            <p className={sectionHdr}>Availability</p>
            <div className="space-y-2.5">
              {[
                { value: 'now',   label: 'Available Now' },
                { value: 'week',  label: 'This Week'     },
                { value: 'month', label: 'This Month'    },
              ].map(a => (
                <label key={a.value} className={checkRow}>
                  <input
                    type="radio"
                    name="availability"
                    value={a.value}
                    defaultChecked={availability === a.value}
                    className={checkBox}
                  />
                  <span className={checkLabel}>{a.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Verified Only */}
          <div className="px-4 py-4">
            <p className={sectionHdr}>Verified Only</p>
            <label className={checkRow}>
              <input
                type="checkbox"
                name="verified"
                value="1"
                defaultChecked={verified === '1'}
                className={checkBox}
              />
              <span className={checkLabel}>Show Verified Only</span>
            </label>
          </div>

          {/* Specialization */}
          <div className="px-4 py-4">
            <p className={sectionHdr}>Specialization</p>
            <div className="space-y-2.5">
              {SPECIALIZATIONS.map(s => (
                <label key={s.value} className={checkRow}>
                  <input
                    type="checkbox"
                    name="specialization"
                    value={s.value}
                    defaultChecked={specialization === s.value}
                    className={checkBox}
                  />
                  <span className={checkLabel}>{s.label}</span>
                </label>
              ))}
            </div>
          </div>

        </div>

        {/* Apply Filters — prominent footer */}
        <div className="px-4 py-4 bg-gray-50/80 border-t border-gray-100">
          <button
            type="submit"
            className="w-full rounded-lg bg-[#B71C1C] text-white py-3 text-[13px] font-bold hover:bg-[#9b1515] active:bg-[#7f1111] transition-colors"
          >
            Apply Filters
          </button>
        </div>

      </div>
    </form>
  )

  return (
    <main className="min-h-screen bg-[#f8f8f8]">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#1a0505] via-[#420e0e] to-[#7f1111] py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-white/60">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-white/60">Professionals</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-white/90">Property Lawyers</span>
            </nav>
            <h1 className="text-3xl font-bold text-white">Property Lawyers</h1>
            <p className="text-white/80 max-w-xl">
              Verified legal professionals for conveyancing, land disputes, title deeds,
              and commercial leases across Cameroon.
            </p>
            {totalLawyers > 0 && (
              <p className="text-white/60 text-sm">
                {totalLawyers} lawyer{totalLawyers !== 1 ? 's' : ''} registered
              </p>
            )}
          </div>
          <div className="shrink-0">
            <Link
              href="/register?role=lawyer"
              className="inline-flex items-center gap-2 rounded-md bg-white text-[#B71C1C] hover:bg-gray-100 px-5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Join as Lawyer
            </Link>
          </div>
        </div>
      </div>

      {/* ── Trust stats bar ────────────────────────────────────────────────── */}
      {totalLawyers > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-5 text-sm text-gray-600">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#B71C1C]" />
                <span><strong className="text-gray-900">{totalLawyers}</strong> lawyers</span>
              </div>
              {avgRating !== null && (
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <span>Avg <strong className="text-gray-900">{avgRating.toFixed(1)}</strong> rating</span>
                </div>
              )}
              {citiesCovered > 0 && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#B71C1C]" />
                  <span>
                    <strong className="text-gray-900">{citiesCovered}</strong>{' '}
                    {citiesCovered === 1 ? 'city' : 'cities'} covered
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Two-column layout ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

          {/* Left: Filter sidebar — sticky panel on desktop, drawer on mobile */}
          <ServicesFilterSidebar title="Filter Lawyers">
            {filterForm}
          </ServicesFilterSidebar>

          {/* Right: Results */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Results count */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-[13px] text-gray-500">
                Showing{' '}
                <strong className="text-gray-800">
                  {Math.min(lawyers.length + offset, totalCount)}
                </strong>{' '}
                of{' '}
                <strong className="text-gray-800">{totalCount}</strong>{' '}
                lawyer{totalCount !== 1 ? 's' : ''}
                {city && (
                  <> in <span className="text-gray-900">{CAMEROON_CITIES.find(c => c.value === city)?.label ?? city}</span></>
                )}
                {specialization && (
                  <> · <span className="text-gray-900">{SPECIALIZATIONS.find(s => s.value === specialization)?.label ?? specialization}</span></>
                )}
              </p>
              {hasFilters && (
                <Link
                  href="/professionals/lawyers"
                  className="text-[12px] text-[#B71C1C] hover:underline font-medium"
                >
                  Clear filters
                </Link>
              )}
            </div>

            {/* Empty state */}
            {lawyers.length === 0 && (
              <div className="text-center py-20 border border-gray-200 rounded-xl bg-white text-muted-foreground">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#fce4e4] mb-4">
                  <span className="text-3xl" aria-hidden="true">⚖️</span>
                </div>
                <p className="font-semibold text-base text-gray-900">
                  {hasFilters ? 'No lawyers match your filters.' : 'No lawyers registered yet.'}
                </p>
                <p className="text-sm mt-1 mb-6 text-gray-500">
                  {hasFilters
                    ? 'Try adjusting your filters or clear them to see all lawyers.'
                    : 'Be the first property lawyer to join the platform.'}
                </p>
                {hasFilters ? (
                  <Link
                    href="/professionals/lawyers"
                    className="inline-flex items-center gap-2 rounded-lg border border-[#B71C1C] text-[#B71C1C] hover:bg-[#fce4e4] px-5 py-2.5 text-sm font-semibold transition-colors"
                  >
                    Clear Filters
                  </Link>
                ) : (
                  <Link
                    href="/register?role=lawyer"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#B71C1C] hover:bg-[#9b1515] text-white px-5 py-2.5 text-sm font-semibold transition-colors"
                  >
                    Join as Lawyer
                  </Link>
                )}
              </div>
            )}

            {/* Lawyer cards */}
            {lawyers.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {lawyers.map(lawyer => {
                    const name              = lawyer.profiles?.full_name ?? 'Unnamed Lawyer'
                    const avatarUrl         = lawyer.profiles?.avatar_url ?? null
                    const cityVal           = lawyer.profiles?.city ?? null
                    const cityLabel         = cityVal
                      ? (CAMEROON_CITIES.find(c => c.value === cityVal)?.label ?? cityVal)
                      : null
                    const lawyerRating      = lawyer.rating_avg   ?? 0
                    const lawyerRatingCount = lawyer.rating_count  ?? 0
                    const expYears          = lawyer.experience_years ?? 0
                    const initial           = name.charAt(0).toUpperCase()

                    // Availability badge config from availability_status (4-state)
                    const availConfig = (() => {
                      switch (lawyer.availability_status) {
                        case 'now':         return { cls: 'bg-emerald-100 text-emerald-700', label: 'Available Now'   }
                        case 'week':        return { cls: 'bg-blue-100   text-blue-700',     label: 'This Week'       }
                        case 'month':       return { cls: 'bg-amber-100  text-amber-700',    label: 'This Month'      }
                        case 'unavailable': return { cls: 'bg-gray-100   text-gray-400',     label: 'Not Available'   }
                        default:            return { cls: 'bg-gray-100   text-gray-400',     label: 'Not Available'   }
                      }
                    })()

                    return (
                      <div
                        key={lawyer.id}
                        className={[
                          'rounded-xl border bg-white flex flex-col overflow-hidden hover:shadow-md transition-shadow',
                          lawyer.is_featured
                            ? 'border-[#B71C1C]/30 ring-1 ring-[#B71C1C]/20'
                            : 'border-gray-200',
                        ].join(' ')}
                      >
                        {/* Featured label */}
                        {lawyer.is_featured && (
                          <div className="px-5 pt-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B71C1C] bg-[#B71C1C]/10 px-2 py-0.5 rounded-full">
                              Featured
                            </span>
                          </div>
                        )}

                        {/* Card body */}
                        <div className="p-5 flex flex-col gap-3 flex-1">

                          {/* Header: avatar + name/info + availability badge */}
                          <div className="flex items-start gap-3">
                            {/* Avatar — real photo or initial fallback */}
                            <div className="shrink-0 w-12 h-12 rounded-full overflow-hidden bg-[#fce4e4] flex items-center justify-center text-base font-bold text-[#B71C1C]">
                              {avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                              ) : (
                                initial
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              {/* Name + Verified badge */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h2 className="font-semibold text-[14px] text-gray-900 leading-tight">
                                  {name}
                                </h2>
                                {lawyer.is_verified && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#B71C1C] bg-[#fce4e4] px-1.5 py-0.5 rounded-full shrink-0">
                                    <ShieldCheck className="h-3 w-3" />
                                    Verified
                                  </span>
                                )}
                              </div>

                              <p className="text-[12px] text-gray-400 mt-0.5">Property Lawyer</p>

                              {/* Location + Experience */}
                              <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1 flex-wrap">
                                {cityLabel && (
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="h-3 w-3 shrink-0" />{cityLabel}
                                  </span>
                                )}
                                {expYears > 0 && (
                                  <span className="flex items-center gap-0.5">
                                    <Briefcase className="h-3 w-3 shrink-0" />{expYears} yr{expYears !== 1 ? 's' : ''} exp
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Availability badge — top-right corner */}
                            <span className={`shrink-0 rounded-full text-[10px] font-semibold px-2.5 py-0.5 whitespace-nowrap ${availConfig.cls}`}>
                              {availConfig.label}
                            </span>
                          </div>

                          {/* Star rating — interactive widget (display + rate form) */}
                          <LawyerRatingWidget
                            lawyerId={lawyer.id}
                            lawyerName={name}
                            ratingAvg={lawyerRating}
                            ratingCount={lawyerRatingCount}
                          />

                          {/* Bio */}
                          {lawyer.bio && (
                            <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2">
                              {lawyer.bio}
                            </p>
                          )}

                          {/* Specialization pills */}
                          {lawyer.specializations.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {lawyer.specializations.slice(0, 4).map(spec => {
                                const specLabel = SPECIALIZATIONS.find(s => s.value === spec)?.label ?? spec
                                return (
                                  <span
                                    key={spec}
                                    className="rounded-full bg-[#fce4e4]/70 text-[#B71C1C] text-[11px] px-2.5 py-0.5 font-medium"
                                  >
                                    {specLabel}
                                  </span>
                                )
                              })}
                              {lawyer.specializations.length > 4 && (
                                <span className="rounded-full bg-gray-100 text-gray-400 text-[11px] px-2.5 py-0.5">
                                  +{lawyer.specializations.length - 4}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] text-gray-400 italic">Specialization not listed</p>
                          )}
                        </div>

                        {/* Card footer: rate + Contact */}
                        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
                          <div className="text-[12px]">
                            {(lawyer.day_rate ?? 0) > 0 ? (
                              <span>
                                <span className="font-semibold text-gray-800">
                                  {(lawyer.day_rate! / 1000).toFixed(0)}K XAF
                                </span>
                                <span className="text-gray-400">/day</span>
                              </span>
                            ) : (
                              <span className="text-gray-400">Rate on request</span>
                            )}
                          </div>
                          <Link
                            href="/login"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#B71C1C] hover:bg-[#9b1515] active:bg-[#7f1111] text-white px-4 py-2 text-[12px] font-semibold transition-colors whitespace-nowrap"
                          >
                            Contact
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <ListingPagination
                  currentPage={page}
                  totalPages={totalPages}
                  buildHref={buildHref}
                />
              </>
            )}
          </div>

        </div>
      </div>

      {/* ── CTA banner ─────────────────────────────────────────────────────── */}
      <section className="px-4 pb-12">
        <div className="max-w-7xl mx-auto">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #7f1111 0%, #B71C1C 60%, #c62828 100%)' }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-6 py-10 md:px-12">
              <div className="text-center sm:text-left">
                <p
                  className="text-[11px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  For Legal Professionals
                </p>
                <h2
                  className="font-extrabold text-white leading-snug"
                  style={{ fontSize: 'clamp(18px, 2.5vw, 26px)' }}
                >
                  Grow Your Legal Practice
                </h2>
                <p
                  className="text-[14px] mt-2 max-w-[420px]"
                  style={{ color: 'rgba(255,255,255,0.80)' }}
                >
                  Connect with clients seeking property lawyers across Cameroon — from
                  conveyancing and title deeds to land disputes and commercial leases.
                </p>
              </div>
              <Link
                href="/register?role=lawyer"
                className="shrink-0 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white font-bold text-[14px] whitespace-nowrap hover:bg-gray-100 transition-colors"
                style={{ color: '#B71C1C' }}
              >
                Join as Lawyer →
              </Link>
            </div>
          </div>
        </div>
      </section>

    </main>
  )
}
