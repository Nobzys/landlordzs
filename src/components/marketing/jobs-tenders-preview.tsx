import Link from 'next/link'
import { MapPin, DollarSign, Calendar, Briefcase, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatXAF } from '@/lib/utils/format'
import { CAMEROON_CITIES } from '@/lib/utils/constants'

type PreviewJob = {
  id:            string
  title:         string
  category:      string | null
  job_type:      string
  city:          string | null
  is_remote:     boolean
  salary_min:    number | null
  salary_max:    number | null
  salary_period: string
  published_at:  string | null
}

type PreviewTender = {
  id:                  string
  title:               string
  category:            string | null
  city:                string | null
  budget_min:          number | null
  budget_max:          number | null
  submission_deadline: string
  published_at:        string | null
}

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time:  'Full-time',
  part_time:  'Part-time',
  contract:   'Contract',
  freelance:  'Freelance',
  internship: 'Internship',
}

const SALARY_SUFFIX: Record<string, string> = {
  hour: '/hr', day: '/day', week: '/wk', month: '/mo', year: '/yr',
}

function fmtSalary(min: number | null, max: number | null, period: string): string | null {
  const s = SALARY_SUFFIX[period] ?? ''
  if (min && max) return `${formatXAF(min)} – ${formatXAF(max)}${s}`
  if (min)        return `From ${formatXAF(min)}${s}`
  if (max)        return `Up to ${formatXAF(max)}${s}`
  return null
}

function fmtBudget(min: number | null, max: number | null): string | null {
  if (min && max) return `${formatXAF(min)} – ${formatXAF(max)}`
  if (min)        return `From ${formatXAF(min)}`
  if (max)        return `Up to ${formatXAF(max)}`
  return null
}

function cityName(value: string | null): string | null {
  if (!value) return null
  return CAMEROON_CITIES.find(c => c.value === value)?.label ?? value
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CM', { month: 'short', day: 'numeric' })
}

export default async function JobsTendersPreview() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const today = new Date().toISOString().split('T')[0]

  const [jobsRes, tendersRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, title, category, job_type, city, is_remote, salary_min, salary_max, salary_period, published_at')
      .eq('status', 'active')
      .order('published_at', { ascending: false })
      .limit(4) as Promise<{ data: PreviewJob[] | null }>,
    supabase
      .from('tenders')
      .select('id, title, category, city, budget_min, budget_max, submission_deadline, published_at')
      .eq('status', 'published')
      .gte('submission_deadline', today)
      .order('published_at', { ascending: false })
      .limit(2) as Promise<{ data: PreviewTender[] | null }>,
  ])

  const jobs    = jobsRes.data    ?? []
  const tenders = tendersRes.data ?? []
  const hasData = jobs.length > 0 || tenders.length > 0

  // Interleave: jobs first, then tenders (max 6 total)
  const items = [
    ...jobs.slice(0, 4).map(j => ({ kind: 'job' as const, data: j })),
    ...tenders.slice(0, 2).map(t => ({ kind: 'tender' as const, data: t })),
  ]

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-[1280px] mx-auto px-5">

        {/* Section header */}
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2
              className="font-extrabold text-[#222222] tracking-[-0.5px]"
              style={{ fontSize: 'clamp(18px, 2vw, 24px)' }}
            >
              Jobs &amp; Tenders
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Construction, engineering &amp; property opportunities
            </p>
          </div>
          <Link
            href="/jobs"
            className="text-[13.5px] font-semibold whitespace-nowrap hover:underline"
            style={{ color: '#B71C1C' }}
          >
            All Listings →
          </Link>
        </div>

        {!hasData ? (
          /* Fallback when DB is empty: static category tiles */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Construction',    sub: 'Site & project roles'     },
              { label: 'Engineering',     sub: 'Civil, structural & MEP'  },
              { label: 'Property Mgmt',   sub: 'Facilities & maintenance' },
              { label: 'Architecture',    sub: 'Design & drafting'        },
              { label: 'Legal & Finance', sub: 'Conveyancing & valuation' },
              { label: 'Tenders',         sub: 'Government & private'     },
            ].map(item => (
              <Link
                key={item.label}
                href="/jobs"
                className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-[#B71C1C] hover:shadow-sm transition-all group"
              >
                <span className="text-[13px] font-semibold text-gray-900 group-hover:text-[#B71C1C] transition-colors leading-tight">
                  {item.label}
                </span>
                <span className="text-[11px] text-gray-500 leading-tight truncate">{item.sub}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => {
              if (item.kind === 'job') {
                const job = item.data as PreviewJob
                const salary = fmtSalary(job.salary_min, job.salary_max, job.salary_period)
                const loc    = job.is_remote ? 'Remote' : cityName(job.city)
                return (
                  <Link
                    key={`job-${job.id}`}
                    href={`/jobs/${job.id}`}
                    className="group block rounded-xl border border-gray-200 bg-white hover:border-[#B71C1C]/50 hover:shadow-sm transition-all p-5"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B71C1C]/10 text-[#B71C1C] px-2.5 py-0.5 text-[11px] font-semibold">
                        <Briefcase className="h-3 w-3" />
                        {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
                      </span>
                      {job.published_at && (
                        <span className="text-[11px] text-gray-400 shrink-0">
                          {shortDate(job.published_at)}
                        </span>
                      )}
                    </div>

                    <p className="font-semibold text-[14px] text-gray-900 leading-snug line-clamp-2 group-hover:text-[#B71C1C] transition-colors mb-1">
                      {job.title}
                    </p>
                    {job.category && (
                      <p className="text-[12px] text-gray-500 mb-3 truncate">{job.category}</p>
                    )}

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-gray-500">
                      {loc && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {loc}
                        </span>
                      )}
                      {salary && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 shrink-0" />
                          {salary}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              }

              // Tender card
              const tender = item.data as PreviewTender
              const budget  = fmtBudget(tender.budget_min, tender.budget_max)
              const loc     = cityName(tender.city)
              const dl      = shortDate(tender.submission_deadline)
              return (
                <Link
                  key={`tender-${tender.id}`}
                  href={`/tenders/${tender.id}`}
                  className="group block rounded-xl border border-gray-200 bg-white hover:border-[#B71C1C]/50 hover:shadow-sm transition-all p-5"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2.5 py-0.5 text-[11px] font-semibold">
                      <FileText className="h-3 w-3" />
                      Tender
                    </span>
                    <span className="text-[11px] text-gray-400 shrink-0">
                      Due {dl}
                    </span>
                  </div>

                  <p className="font-semibold text-[14px] text-gray-900 leading-snug line-clamp-2 group-hover:text-[#B71C1C] transition-colors mb-1">
                    {tender.title}
                  </p>
                  {tender.category && (
                    <p className="text-[12px] text-gray-500 mb-3 truncate">{tender.category}</p>
                  )}

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-gray-500">
                    {loc && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {loc}
                      </span>
                    )}
                    {budget && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 shrink-0" />
                        {budget}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />
                      Deadline {dl}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* View all CTA */}
        <div className="mt-6 text-center">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 rounded-lg border border-[#B71C1C] text-[#B71C1C] px-5 py-2.5 text-sm font-semibold hover:bg-[#B71C1C] hover:text-white transition-colors"
          >
            View All Jobs &amp; Tenders
          </Link>
        </div>
      </div>
    </section>
  )
}
