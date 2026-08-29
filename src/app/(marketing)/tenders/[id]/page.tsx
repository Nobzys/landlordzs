import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { FileText, MapPin, DollarSign, Calendar, Clock, CheckCircle, Users, Building } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { submitTenderBid } from '@/lib/actions/tenders'
import { formatXAF } from '@/lib/utils/format'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'

interface PageProps {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ bid?: string; error?: string }>
}

type TenderDetailRow = {
  id:                  string
  poster_id:           string
  title:               string
  description:         string
  scope_of_work:       string | null
  requirements:        string | null
  category:            string | null
  city:                string | null
  address:             string | null
  budget_min:          number | null
  budget_max:          number | null
  status:              string
  submission_deadline: string
  start_date:          string | null
  completion_date:     string | null
  bid_count:           number
  published_at:        string | null
  awarded_at:          string | null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('tenders')
    .select('title, description')
    .eq('id', id)
    .single() as { data: { title: string; description: string } | null }

  if (!data) return { title: 'Tender Not Found' }
  return {
    title: `${data.title} — Landlordzs Tenders`,
    description: data.description.slice(0, 160),
  }
}

export default async function TenderDetailPage({ params, searchParams }: PageProps) {
  const { id }                     = await params
  const { bid, error: errorParam } = await searchParams

  const [supabase, profile] = await Promise.all([
    createClient(),
    getServerProfile(),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tender } = await (supabase as any)
    .from('tenders')
    .select(`
      id, poster_id, title, description, scope_of_work, requirements,
      category, city, address, budget_min, budget_max, status,
      submission_deadline, start_date, completion_date,
      bid_count, published_at, awarded_at
    `)
    .eq('id', id)
    .single() as { data: TenderDetailRow | null }

  if (!tender) notFound()

  // Check whether the current user has already bid
  let hasBid = false
  if (profile) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('tender_bids')
      .select('id')
      .eq('tender_id', id)
      .eq('bidder_id', profile.id)
      .maybeSingle() as { data: { id: string } | null }
    hasBid = !!existing
  }

  const today       = new Date().toISOString().split('T')[0]
  const isOwner     = profile?.id === tender.poster_id
  const isPublished = tender.status === 'published'
  const isExpired   = tender.submission_deadline < today
  const canBid      = isPublished && !isExpired

  const locLabel    = tender.city
    ? (CAMEROON_CITIES.find(c => c.value === tender.city)?.label ?? tender.city)
    : null

  const budgetStr = (() => {
    if (tender.budget_min && tender.budget_max)
      return `${formatXAF(tender.budget_min)} – ${formatXAF(tender.budget_max)}`
    if (tender.budget_min) return `From ${formatXAF(tender.budget_min)}`
    if (tender.budget_max) return `Up to ${formatXAF(tender.budget_max)}`
    return null
  })()

  const deadlineStr = new Date(tender.submission_deadline).toLocaleDateString('en-CM', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // Inline server action closes over `id` for redirect URL construction
  async function placeBid(formData: FormData) {
    'use server'
    const result = await submitTenderBid(formData)
    if (result.error) {
      redirect(`/tenders/${id}?error=${encodeURIComponent(result.error)}`)
    }
    redirect(`/tenders/${id}?bid=1`)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link href="/tenders" className="hover:text-foreground transition-colors">Tenders</Link>
          <span>/</span>
          <span className="text-foreground line-clamp-1">{tender.title}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Left: tender detail ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                {tender.status !== 'published' && (
                  <Badge variant="destructive" className="capitalize">{tender.status}</Badge>
                )}
                {isExpired && tender.status === 'published' && (
                  <Badge variant="outline">Deadline passed</Badge>
                )}
              </div>

              <h1 className="text-2xl font-bold leading-snug">{tender.title}</h1>

              {tender.category && (
                <p className="text-sm text-muted-foreground">{tender.category}</p>
              )}

              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                {locLabel && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {locLabel}
                    {tender.address && ` — ${tender.address}`}
                  </span>
                )}
                {budgetStr && (
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 shrink-0" />
                    {budgetStr}
                  </span>
                )}
                <span className={`flex items-center gap-1.5 ${isExpired ? 'text-destructive' : ''}`}>
                  <Calendar className="h-4 w-4 shrink-0" />
                  Deadline: {deadlineStr}
                </span>
                {tender.start_date && (
                  <span className="flex items-center gap-1.5">
                    <Building className="h-4 w-4 shrink-0" />
                    Start: {new Date(tender.start_date).toLocaleDateString('en-CM', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                {tender.bid_count > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 shrink-0" />
                    {tender.bid_count} bid{tender.bid_count !== 1 ? 's' : ''} submitted
                  </span>
                )}
                {tender.published_at && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0" />
                    Published {new Date(tender.published_at).toLocaleDateString('en-CM', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <section className="space-y-2">
              <h2 className="font-semibold text-base">Description</h2>
              <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {tender.description}
              </div>
            </section>

            {/* Scope of Work */}
            {tender.scope_of_work && (
              <section className="space-y-2">
                <h2 className="font-semibold text-base">Scope of Work</h2>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {tender.scope_of_work}
                </div>
              </section>
            )}

            {/* Requirements */}
            {tender.requirements && (
              <section className="space-y-2">
                <h2 className="font-semibold text-base">Requirements & Eligibility</h2>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {tender.requirements}
                </div>
              </section>
            )}

            {/* Timeline */}
            {(tender.start_date || tender.completion_date) && (
              <section className="space-y-3">
                <h2 className="font-semibold text-base">Project Timeline</h2>
                <div className="flex flex-wrap gap-6 text-sm">
                  {tender.start_date && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Expected Start</p>
                      <p className="font-medium">
                        {new Date(tender.start_date).toLocaleDateString('en-CM', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {tender.completion_date && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Expected Completion</p>
                      <p className="font-medium">
                        {new Date(tender.completion_date).toLocaleDateString('en-CM', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Awarded notice */}
            {tender.status === 'awarded' && tender.awarded_at && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm">
                <p className="font-medium text-blue-700 dark:text-blue-400">
                  This tender has been awarded.
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Awarded on {new Date(tender.awarded_at).toLocaleDateString('en-CM', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>

          {/* ── Right: bid panel ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* Success banner */}
              {bid === '1' && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 flex items-start gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Bid submitted!</p>
                    <p className="text-xs mt-0.5 opacity-80">The issuer will review your proposal.</p>
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
                <h2 className="font-semibold text-base">Submit a Bid</h2>

                {!isPublished ? (
                  <p className="text-sm text-muted-foreground capitalize">
                    This tender is {tender.status} and no longer accepting bids.
                  </p>
                ) : isExpired ? (
                  <p className="text-sm text-muted-foreground">
                    The submission deadline has passed.
                  </p>
                ) : isOwner ? (
                  <p className="text-sm text-muted-foreground">
                    This is your tender notice.
                  </p>
                ) : !profile ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Sign in to submit a bid for this tender.
                    </p>
                    <LinkButton
                      href={`/login?redirect=/tenders/${id}`}
                      className="w-full"
                    >
                      Sign in to bid
                    </LinkButton>
                  </div>
                ) : hasBid || bid === '1' ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      You have already submitted a bid for this tender.
                    </p>
                    <Link href="/tenders" className="text-sm text-primary hover:underline">
                      Browse more tenders →
                    </Link>
                  </div>
                ) : (
                  <form action={placeBid} className="space-y-3">
                    <input type="hidden" name="tender_id" value={tender.id} />

                    <div className="space-y-1.5">
                      <label htmlFor="amount" className="text-sm font-medium">
                        Bid Amount (XAF) <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="amount"
                        name="amount"
                        type="number"
                        min="1"
                        required
                        placeholder="e.g. 5000000"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="timeline_days" className="text-sm font-medium">
                        Timeline (days) <span className="text-muted-foreground text-xs">(optional)</span>
                      </label>
                      <input
                        id="timeline_days"
                        name="timeline_days"
                        type="number"
                        min="1"
                        placeholder="e.g. 90"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="proposal" className="text-sm font-medium">
                        Proposal <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        id="proposal"
                        name="proposal"
                        rows={6}
                        required
                        placeholder="Describe your approach, experience, and why you are best suited for this tender…"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Submit Bid
                    </button>

                    <p className="text-xs text-muted-foreground text-center">
                      Deadline: {deadlineStr}
                    </p>
                  </form>
                )}
              </div>

              {/* Stats card */}
              {(budgetStr || canBid) && (
                <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
                  {budgetStr && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Budget</span>
                      <span className="font-medium">{budgetStr}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deadline</span>
                    <span className={`font-medium ${isExpired ? 'text-destructive' : ''}`}>
                      {new Date(tender.submission_deadline).toLocaleDateString('en-CM', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {tender.bid_count > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bids received</span>
                      <span className="font-medium">{tender.bid_count}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Back link */}
              <Link href="/tenders" className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Back to all tenders
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
