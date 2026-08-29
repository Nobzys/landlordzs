import type { Metadata } from 'next'
import Link from 'next/link'
import { Briefcase, MapPin, DollarSign, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatXAF } from '@/lib/utils/format'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Jobs Board — Landlordzs',
  description:
    'Browse full-time, part-time, and contract job opportunities across Cameroon.',
}

const PAGE_SIZE = 15

interface PageProps {
  searchParams: Promise<{
    type?:   string
    city?:   string
    remote?: string
    page?:   string
  }>
}

type JobRow = {
  id:             string
  title:          string
  description:    string
  job_type:       string
  city:           string | null
  is_remote:      boolean
  salary_min:     number | null
  salary_max:     number | null
  salary_period:  string
  skills_required: string[]
  deadline:       string | null
  category:       string | null
  application_count: number
  published_at:   string | null
}

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time:  'Full-time',
  part_time:  'Part-time',
  contract:   'Contract',
  freelance:  'Freelance',
  internship: 'Internship',
}

const SALARY_PERIOD_LABELS: Record<string, string> = {
  hour:  '/hr',
  day:   '/day',
  week:  '/wk',
  month: '/mo',
  year:  '/yr',
}

function formatSalary(min: number | null, max: number | null, period: string): string | null {
  const periodLabel = SALARY_PERIOD_LABELS[period] ?? `/${period}`
  if (min && max) return `${formatXAF(min)} – ${formatXAF(max)}${periodLabel}`
  if (min)        return `From ${formatXAF(min)}${periodLabel}`
  if (max)        return `Up to ${formatXAF(max)}${periodLabel}`
  return null
}

function formatDeadline(date: string | null): string | null {
  if (!date) return null
  const d = new Date(date)
  return d.toLocaleDateString('en-CM', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default async function JobsPage({ searchParams }: PageProps) {
  const { type, city, remote, page: pageStr } = await searchParams
  const page   = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE
  const isRemote = remote === '1'

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let jobsQuery = (supabase as any)
    .from('jobs')
    .select(
      `id, title, description, job_type, city, is_remote,
       salary_min, salary_max, salary_period, skills_required,
       deadline, category, application_count, published_at`,
      { count: 'exact' }
    )
    .eq('status', 'active')
    .order('published_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (type)     jobsQuery = jobsQuery.eq('job_type', type)
  if (city)     jobsQuery = jobsQuery.eq('city', city)
  if (isRemote) jobsQuery = jobsQuery.eq('is_remote', true)

  const jobsRes = await jobsQuery as { data: JobRow[] | null; count: number | null }

  const jobs       = jobsRes.data ?? []
  const totalCount = jobsRes.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const cityLabel = city
    ? (CAMEROON_CITIES.find(c => c.value === city)?.label ?? city)
    : null

  function buildHref(overrides: {
    type?:   string | null
    city?:   string | null
    remote?: string | null
    page?:   number
  }) {
    const params = new URLSearchParams()
    const nt = 'type'   in overrides ? overrides.type   : type
    const nc = 'city'   in overrides ? overrides.city   : city
    const nr = 'remote' in overrides ? overrides.remote : (isRemote ? '1' : null)
    const np = overrides.page ?? 1
    if (nt) params.set('type',   nt)
    if (nc) params.set('city',   nc)
    if (nr) params.set('remote', nr)
    if (np > 1) params.set('page', String(np))
    const qs = params.toString()
    return `/jobs${qs ? `?${qs}` : ''}`
  }

  const JOB_TYPES = [
    { value: null,        label: 'All types' },
    { value: 'full_time', label: 'Full-time' },
    { value: 'part_time', label: 'Part-time' },
    { value: 'contract',  label: 'Contract' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'internship',label: 'Internship' },
  ]

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary py-12 px-4">
        <div className="max-w-5xl mx-auto space-y-3">
          <h1 className="text-3xl font-bold text-primary-foreground">Jobs Board</h1>
          <p className="text-primary-foreground/80 max-w-xl">
            Full-time, contract, and freelance opportunities across Cameroon.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Filter row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Type filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {JOB_TYPES.map(opt => (
              <Link
                key={opt.label}
                href={buildHref({ type: opt.value, page: 1 })}
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

          {/* Remote toggle */}
          <Link
            href={buildHref({ remote: isRemote ? null : '1', page: 1 })}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              isRemote
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            Remote only
          </Link>

          {/* City filter */}
          <form method="GET" action="/jobs" className="flex items-center gap-2">
            {type     && <input type="hidden" name="type"   value={type} />}
            {isRemote && <input type="hidden" name="remote" value="1" />}
            <select
              name="city"
              defaultValue={city ?? ''}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All cities</option>
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

        {/* Result summary */}
        <p className="text-sm text-muted-foreground">
          {totalCount} job{totalCount !== 1 ? 's' : ''}
          {type       ? ` · ${JOB_TYPE_LABELS[type] ?? type}` : ''}
          {isRemote   ? ' · Remote' : ''}
          {cityLabel  ? ` in ${cityLabel}` : ''}
        </p>

        {/* Job list */}
        {jobs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Briefcase className="mx-auto h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">No jobs match your filters.</p>
            <p className="text-sm mt-1">Try removing a filter or check back later.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => {
              const salaryStr   = formatSalary(job.salary_min, job.salary_max, job.salary_period)
              const deadlineStr = formatDeadline(job.deadline)
              const locLabel    = job.is_remote
                ? 'Remote'
                : job.city
                  ? (CAMEROON_CITIES.find(c => c.value === job.city)?.label ?? job.city)
                  : null

              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="group block rounded-xl border bg-card hover:border-primary/40 transition-colors p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      {job.category && (
                        <p className="text-xs text-muted-foreground">{job.category}</p>
                      )}
                      <h2 className="font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {job.title}
                      </h2>
                      <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 capitalize whitespace-nowrap text-xs">
                      {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
                    </Badge>
                  </div>

                  {/* Skills */}
                  {job.skills_required.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.skills_required.slice(0, 4).map(skill => (
                        <span
                          key={skill}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills_required.length > 4 && (
                        <span className="text-xs text-muted-foreground self-center">
                          +{job.skills_required.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t text-xs text-muted-foreground">
                    {locLabel && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {locLabel}
                      </span>
                    )}
                    {salaryStr && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {salaryStr}
                      </span>
                    )}
                    {deadlineStr && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Deadline {deadlineStr}
                      </span>
                    )}
                    {job.application_count > 0 && (
                      <span className="ml-auto">
                        {job.application_count} applicant{job.application_count !== 1 ? 's' : ''}
                      </span>
                    )}
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
