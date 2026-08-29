import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Briefcase, MapPin, DollarSign, Calendar, Clock, CheckCircle, Users } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { applyToJob } from '@/lib/actions/jobs'
import { formatXAF } from '@/lib/utils/format'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'

interface PageProps {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ applied?: string; error?: string }>
}

type JobDetailRow = {
  id:                   string
  poster_id:            string
  title:                string
  description:          string
  requirements:         string | null
  responsibilities:     string | null
  category:             string | null
  job_type:             string
  city:                 string | null
  is_remote:            boolean
  salary_min:           number | null
  salary_max:           number | null
  salary_period:        string
  experience_years_min: number
  skills_required:      string[]
  status:               string
  application_count:    number
  deadline:             string | null
  published_at:         string | null
}

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time:  'Full-time',
  part_time:  'Part-time',
  contract:   'Contract',
  freelance:  'Freelance',
  internship: 'Internship',
}

const SALARY_PERIOD_LABELS: Record<string, string> = {
  hour:  'per hour',
  day:   'per day',
  week:  'per week',
  month: 'per month',
  year:  'per year',
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('jobs')
    .select('title, description')
    .eq('id', id)
    .single() as { data: { title: string; description: string } | null }

  if (!data) return { title: 'Job Not Found' }
  return {
    title: `${data.title} — Landlordzs Jobs`,
    description: data.description.slice(0, 160),
  }
}

export default async function JobDetailPage({ params, searchParams }: PageProps) {
  const { id }                         = await params
  const { applied, error: errorParam } = await searchParams

  const [supabase, profile] = await Promise.all([
    createClient(),
    getServerProfile(),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (supabase as any)
    .from('jobs')
    .select(`
      id, poster_id, title, description, requirements, responsibilities,
      category, job_type, city, is_remote,
      salary_min, salary_max, salary_period,
      experience_years_min, skills_required,
      status, application_count, deadline, published_at
    `)
    .eq('id', id)
    .single() as { data: JobDetailRow | null }

  if (!job) notFound()

  // Check whether the current user has already applied
  let hasApplied = false
  if (profile) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('job_applications')
      .select('id')
      .eq('job_id', id)
      .eq('applicant_id', profile.id)
      .maybeSingle() as { data: { id: string } | null }
    hasApplied = !!existing
  }

  const isOwner    = profile?.id === job.poster_id
  const isActive   = job.status === 'active'
  const locLabel   = job.is_remote
    ? 'Remote'
    : job.city
      ? (CAMEROON_CITIES.find(c => c.value === job.city)?.label ?? job.city)
      : null

  const salaryStr = (() => {
    const p = SALARY_PERIOD_LABELS[job.salary_period] ?? `per ${job.salary_period}`
    if (job.salary_min && job.salary_max)
      return `${formatXAF(job.salary_min)} – ${formatXAF(job.salary_max)} ${p}`
    if (job.salary_min) return `From ${formatXAF(job.salary_min)} ${p}`
    if (job.salary_max) return `Up to ${formatXAF(job.salary_max)} ${p}`
    return null
  })()

  const deadlineStr = job.deadline
    ? new Date(job.deadline).toLocaleDateString('en-CM', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  // Inline server action: closes over `id` for redirect URL
  async function submitApplication(formData: FormData) {
    'use server'
    const result = await applyToJob(formData)
    if (result.error) {
      redirect(`/jobs/${id}?error=${encodeURIComponent(result.error)}`)
    }
    redirect(`/jobs/${id}?applied=1`)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link href="/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
          <span>/</span>
          <span className="text-foreground line-clamp-1">{job.title}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Left: job detail ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="secondary">{JOB_TYPE_LABELS[job.job_type] ?? job.job_type}</Badge>
                {job.is_remote && <Badge variant="outline">Remote</Badge>}
                {job.status !== 'active' && (
                  <Badge variant="destructive" className="capitalize">{job.status}</Badge>
                )}
              </div>

              <h1 className="text-2xl font-bold leading-snug">{job.title}</h1>

              {job.category && (
                <p className="text-sm text-muted-foreground">{job.category}</p>
              )}

              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                {locLabel && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {locLabel}
                  </span>
                )}
                {salaryStr && (
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 shrink-0" />
                    {salaryStr}
                  </span>
                )}
                {job.experience_years_min > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 shrink-0" />
                    {job.experience_years_min}+ years experience
                  </span>
                )}
                {deadlineStr && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 shrink-0" />
                    Deadline: {deadlineStr}
                  </span>
                )}
                {job.application_count > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 shrink-0" />
                    {job.application_count} applicant{job.application_count !== 1 ? 's' : ''}
                  </span>
                )}
                {job.published_at && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0" />
                    Posted {new Date(job.published_at).toLocaleDateString('en-CM', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>

            {/* Skills */}
            {job.skills_required.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-semibold text-base">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills_required.map(skill => (
                    <span
                      key={skill}
                      className="rounded-full border px-3 py-1 text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <section className="space-y-2">
              <h2 className="font-semibold text-base">Job Description</h2>
              <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {job.description}
              </div>
            </section>

            {/* Responsibilities */}
            {job.responsibilities && (
              <section className="space-y-2">
                <h2 className="font-semibold text-base">Responsibilities</h2>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {job.responsibilities}
                </div>
              </section>
            )}

            {/* Requirements */}
            {job.requirements && (
              <section className="space-y-2">
                <h2 className="font-semibold text-base">Requirements</h2>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {job.requirements}
                </div>
              </section>
            )}
          </div>

          {/* ── Right: application panel ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* Success banner */}
              {applied === '1' && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 flex items-start gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Application submitted!</p>
                    <p className="text-xs mt-0.5 opacity-80">The poster will review your application.</p>
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
                <h2 className="font-semibold text-base">Apply for this role</h2>

                {!isActive ? (
                  <p className="text-sm text-muted-foreground">
                    This position is no longer accepting applications.
                  </p>
                ) : isOwner ? (
                  <p className="text-sm text-muted-foreground">
                    This is your job listing.
                  </p>
                ) : !profile ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Sign in to apply for this position.
                    </p>
                    <LinkButton
                      href={`/login?redirect=/jobs/${id}`}
                      className="w-full"
                    >
                      Sign in to apply
                    </LinkButton>
                  </div>
                ) : hasApplied || applied === '1' ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      You have already applied for this position.
                    </p>
                    <Link href="/jobs" className="text-sm text-primary hover:underline">
                      Browse more jobs →
                    </Link>
                  </div>
                ) : (
                  <form action={submitApplication} className="space-y-3">
                    <input type="hidden" name="job_id" value={job.id} />

                    <div className="space-y-1.5">
                      <label htmlFor="cover_letter" className="text-sm font-medium">
                        Cover Letter <span className="text-muted-foreground text-xs">(optional)</span>
                      </label>
                      <textarea
                        id="cover_letter"
                        name="cover_letter"
                        rows={5}
                        placeholder="Introduce yourself and explain why you're a great fit…"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="cv_url" className="text-sm font-medium">
                        CV / Résumé URL <span className="text-muted-foreground text-xs">(optional)</span>
                      </label>
                      <input
                        id="cv_url"
                        name="cv_url"
                        type="url"
                        placeholder="https://drive.google.com/…"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <p className="text-xs text-muted-foreground">Link to Google Drive, Dropbox, or LinkedIn</p>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="portfolio_url" className="text-sm font-medium">
                        Portfolio / GitHub URL <span className="text-muted-foreground text-xs">(optional)</span>
                      </label>
                      <input
                        id="portfolio_url"
                        name="portfolio_url"
                        type="url"
                        placeholder="https://github.com/…"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="expected_salary" className="text-sm font-medium">
                        Expected Salary (XAF) <span className="text-muted-foreground text-xs">(optional)</span>
                      </label>
                      <input
                        id="expected_salary"
                        name="expected_salary"
                        type="number"
                        min="0"
                        placeholder="e.g. 500000"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Submit Application
                    </button>
                  </form>
                )}
              </div>

              {/* Back link */}
              <Link href="/jobs" className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Back to all jobs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
