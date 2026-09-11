import type { Metadata } from 'next'
import Link from 'next/link'
import { Briefcase, MapPin, DollarSign, Calendar, PlusCircle, Bookmark } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatXAF } from '@/lib/utils/format'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { ListingPagination } from '@/components/ui/listing-pagination'
import { ServicesFilterSidebar } from '@/components/services/ServicesFilterSidebar'

export const metadata: Metadata = {
  title: 'Jobs & Careers — Landlordzs',
  description:
    'Property, construction & engineering opportunities across Cameroon.',
}

const PAGE_SIZE = 8

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time:  'Full-time',
  part_time:  'Part-time',
  contract:   'Contract',
  freelance:  'Freelance',
  internship: 'Internship',
}

const SALARY_PERIOD_SUFFIX: Record<string, string> = {
  hour:  '/hr',
  day:   '/day',
  week:  '/wk',
  month: '/mo',
  year:  '/yr',
}

const DATE_POSTED_OPTIONS = [
  { value: '',         label: 'Any time'      },
  { value: 'last_24h', label: 'Last 24 hours' },
  { value: 'last_7d',  label: 'Last 7 days'   },
  { value: 'last_30d', label: 'Last 30 days'  },
]

// Predefined job categories for the Jobs & Careers marketplace.
// Used as the static baseline for the category dropdown so the filter
// is always populated even when the jobs table has no active records.
// DB-derived distinct values are merged in at runtime to surface any
// categories that were entered freely by employers but aren't in this list.
const STATIC_JOB_CATEGORIES = [
  'Real Estate Sales',
  'Property Management',
  'Civil Engineering',
  'Architecture',
  'Electrical Engineering',
  'Project Management',
  'Site Supervision',
  'Estimating / Quantity Surveying',
  'Construction',
  'Administration / Finance',
  'Marketing',
  'Legal & Compliance',
  'Plumbing & Sanitation',
  'Mechanical Engineering',
  'Interior Design',
  'Other',
]

interface PageProps {
  searchParams: Promise<{
    category?:    string
    type?:        string
    city?:        string
    remote?:      string
    exp?:         string
    salary_min?:  string
    salary_max?:  string
    date_posted?: string
    page?:        string
  }>
}

type JobRow = {
  id:                   string
  title:                string
  category:             string | null
  job_type:             string
  city:                 string | null
  is_remote:            boolean
  salary_min:           number | null
  salary_max:           number | null
  salary_period:        string
  experience_years_min: number
  skills_required:      string[]
  deadline:             string | null
  application_count:    number
  published_at:         string | null
}

function formatSalary(min: number | null, max: number | null, period: string): string | null {
  const s = SALARY_PERIOD_SUFFIX[period] ?? `/${period}`
  if (min && max) return `${formatXAF(min)} – ${formatXAF(max)}${s}`
  if (min)        return `From ${formatXAF(min)}${s}`
  if (max)        return `Up to ${formatXAF(max)}${s}`
  return null
}

function experienceLabel(years: number): string {
  if (years >= 10) return 'Director+'
  if (years >= 6)  return 'Senior'
  if (years >= 3)  return 'Mid-level'
  return 'Entry-level'
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CM', { month: 'short', day: 'numeric' })
}

export default async function JobsPage({ searchParams }: PageProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const sp         = await searchParams
  const category   = sp.category    || null
  const type       = sp.type        || null
  const city       = sp.city        || null
  const isRemote   = sp.remote === '1'
  const exp        = sp.exp         || null
  const salaryMin  = sp.salary_min  ? Number(sp.salary_min)  : null
  const salaryMax  = sp.salary_max  ? Number(sp.salary_max)  : null
  const datePosted = sp.date_posted || null
  const page       = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const offset     = (page - 1) * PAGE_SIZE

  const hasFilter = !!(category || type || city || isRemote || exp || salaryMin || salaryMax || datePosted)

  // Fetch distinct categories used by active jobs (may be empty when DB has no records).
  // Merged with the static list so the dropdown is always populated.
  const { data: catRows } = await supabase
    .from('jobs')
    .select('category')
    .eq('status', 'active')
    .not('category', 'is', null) as { data: { category: string }[] | null }

  const dbCategories = (catRows ?? []).map((r: { category: string }) => r.category).filter(Boolean) as string[]
  const categories   = [...new Set([...STATIC_JOB_CATEGORIES, ...dbCategories])]

  // Build main query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from('jobs')
    .select(
      `id, title, category, job_type, city, is_remote,
       salary_min, salary_max, salary_period, experience_years_min,
       skills_required, deadline, application_count, published_at`,
      { count: 'exact' }
    )
    .eq('status', 'active')
    .order('published_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (category)   q = q.eq('category', category)
  if (type)       q = q.eq('job_type', type)
  if (city)       q = q.eq('city', city)
  if (isRemote)   q = q.eq('is_remote', true)
  if (salaryMin)  q = q.gte('salary_min', salaryMin)
  if (salaryMax)  q = q.lte('salary_min', salaryMax)

  if (exp === 'entry')    q = q.lte('experience_years_min', 2)
  if (exp === 'mid')      { q = q.gte('experience_years_min', 3); q = q.lte('experience_years_min', 5) }
  if (exp === 'senior')   { q = q.gte('experience_years_min', 6); q = q.lte('experience_years_min', 9) }
  if (exp === 'director') q = q.gte('experience_years_min', 10)

  if (datePosted) {
    const msMap: Record<string, number> = {
      last_24h: 24 * 60 * 60 * 1000,
      last_7d:  7  * 24 * 60 * 60 * 1000,
      last_30d: 30 * 24 * 60 * 60 * 1000,
    }
    const ms = msMap[datePosted]
    if (ms) q = q.gte('published_at', new Date(Date.now() - ms).toISOString())
  }

  const { data: rawJobs, count } = await q as { data: JobRow[] | null; count: number | null }

  const jobs       = rawJobs ?? []
  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const from       = totalCount === 0 ? 0 : offset + 1
  const to         = Math.min(offset + PAGE_SIZE, totalCount)

  const cityLabel = city ? (CAMEROON_CITIES.find(c => c.value === city)?.label ?? city) : null

  function buildPaginationHref(p: number): string {
    const params = new URLSearchParams()
    if (category)   params.set('category',    category)
    if (type)       params.set('type',        type)
    if (city)       params.set('city',        city)
    if (isRemote)   params.set('remote',      '1')
    if (exp)        params.set('exp',         exp)
    if (salaryMin)  params.set('salary_min',  String(salaryMin))
    if (salaryMax)  params.set('salary_max',  String(salaryMax))
    if (datePosted) params.set('date_posted', datePosted)
    if (p > 1)      params.set('page',        String(p))
    const qs = params.toString()
    return `/jobs${qs ? `?${qs}` : ''}`
  }

  // Filter form — server-rendered; passed as children to sidebar component
  const filterForm = (
    <form method="GET" action="/jobs">
      <div className="p-4 pb-5 rounded-xl border bg-card space-y-5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">Search Filters</span>
          <Link
            href="/jobs"
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

        {/* Job Category */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Job Category
          </p>
          <select
            name="category"
            defaultValue={category ?? ''}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
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

        {/* Job Type */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Job Type
          </p>
          <select
            name="type"
            defaultValue={type ?? ''}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All types</option>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="freelance">Freelance</option>
            <option value="internship">Internship</option>
          </select>
        </div>

        {/* Experience Level */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Experience Level
          </p>
          <select
            name="exp"
            defaultValue={exp ?? ''}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Any level</option>
            <option value="entry">Entry level (0–2 yrs)</option>
            <option value="mid">Mid level (3–5 yrs)</option>
            <option value="senior">Senior (6–9 yrs)</option>
            <option value="director">Director / Executive (10+ yrs)</option>
          </select>
        </div>

        {/* Salary Range */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Salary Range (FCFA/Month)
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              name="salary_min"
              placeholder="Min"
              defaultValue={salaryMin ?? ''}
              min={0}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="number"
              name="salary_max"
              placeholder="Max"
              defaultValue={salaryMax ?? ''}
              min={0}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Date Posted */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Date Posted
          </p>
          <select
            name="date_posted"
            defaultValue={datePosted ?? ''}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {DATE_POSTED_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Remote only */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            name="remote"
            value="1"
            defaultChecked={isRemote}
            className="h-4 w-4 rounded border-input accent-[#B71C1C]"
          />
          <span className="text-sm">Remote only</span>
        </label>

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
      {/* Hero */}
      <div className="bg-[#1a0505] py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          {/* Left: heading + subtitle */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white">Jobs &amp; Careers</h1>
            <p className="text-white/80 max-w-xl text-lg">
              Property, construction &amp; engineering opportunities across Cameroon.
            </p>
          </div>
          {/* Right: Post a Job CTA */}
          <div className="shrink-0">
            <Link
              href="/register?role=employer"
              className="inline-flex items-center gap-2 rounded-md bg-[#B71C1C] hover:bg-[#9b1515] text-white px-5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <PlusCircle className="h-4 w-4" />
              Post a Job
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-0 items-start">

          {/* Persistent sidebar — always visible on desktop, drawer on mobile */}
          <ServicesFilterSidebar title="Search Filters" asideClassName="max-h-[560px]">
            {filterForm}
          </ServicesFilterSidebar>

          {/* Vertical divider — desktop only; self-stretch so it runs the full column height */}
          <div className="hidden lg:block w-px bg-border self-stretch mx-6 shrink-0" aria-hidden="true" />

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Result count + sort */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {totalCount === 0
                  ? 'No jobs found'
                  : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${totalCount.toLocaleString()} job${totalCount !== 1 ? 's' : ''}`}
                {cityLabel ? ` in ${cityLabel}` : ''}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                <span>Sort:</span>
                <span className="font-medium text-foreground">Newest</span>
              </div>
            </div>

            {/* Job cards */}
            {jobs.length === 0 ? (
              <div className="text-center py-20 border rounded-xl text-muted-foreground">
                <Briefcase className="mx-auto h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">No jobs match your filters.</p>
                <p className="text-sm mt-1">Try adjusting or removing some filters.</p>
                {hasFilter && (
                  <Link href="/jobs" className="inline-block mt-4 text-sm text-[#B71C1C] hover:underline">
                    Reset filters
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {jobs.map(job => {
                  const salaryStr  = formatSalary(job.salary_min, job.salary_max, job.salary_period)
                  const expBadge   = experienceLabel(job.experience_years_min)
                  const locLabel   = job.is_remote
                    ? 'Remote'
                    : job.city
                      ? (CAMEROON_CITIES.find(c => c.value === job.city)?.label ?? job.city)
                      : null

                  return (
                    <div
                      key={job.id}
                      className="rounded-xl border bg-card p-5 hover:border-[#B71C1C]/40 transition-colors flex flex-col"
                    >
                      {/* Top row */}
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {job.category && (
                            <span className="truncate rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{job.category}</span>
                          )}
                          <span className="inline-flex items-center shrink-0 rounded-full bg-[#B71C1C]/10 text-[#B71C1C] px-2.5 py-0.5 text-[11px] font-semibold">
                            {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
                          </span>
                        </div>
                        {job.published_at && (
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {shortDate(job.published_at)}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h2 className="font-semibold text-base leading-snug line-clamp-2 mb-2">
                        {job.title}
                      </h2>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                        {locLabel && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {locLabel}
                          </span>
                        )}
                        {salaryStr && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 shrink-0" />
                            {salaryStr}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3 shrink-0" />
                          {expBadge}
                        </span>
                        {job.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 shrink-0" />
                            Deadline {shortDate(job.deadline)}
                          </span>
                        )}
                      </div>

                      {/* Skills */}
                      {job.skills_required.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {job.skills_required.slice(0, 3).map(skill => (
                            <span
                              key={skill}
                              className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.skills_required.length > 3 && (
                            <span className="text-[11px] text-muted-foreground self-center">
                              +{job.skills_required.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-auto pt-3 border-t flex gap-2">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="flex-1 text-center rounded-md bg-[#B71C1C] text-white py-2 text-sm font-semibold hover:bg-[#9b1515] transition-colors"
                        >
                          Apply Now
                        </Link>
                        <Link
                          href={`/login?redirect=/jobs/${job.id}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border py-2 text-sm font-medium hover:bg-muted transition-colors"
                        >
                          <Bookmark className="h-4 w-4" />
                          Save Job
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <ListingPagination
              currentPage={page}
              totalPages={totalPages}
              buildHref={buildPaginationHref}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
