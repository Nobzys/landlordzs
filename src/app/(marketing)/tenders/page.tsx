import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, MapPin, DollarSign, Calendar, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatXAF } from '@/lib/utils/format'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Tenders Board — Landlordzs',
  description: 'Browse public tender notices and submit bids for construction, supply, and service contracts across Cameroon.',
}

const PAGE_SIZE = 15

interface PageProps {
  searchParams: Promise<{
    city?: string
    page?: string
  }>
}

type TenderRow = {
  id:                  string
  title:               string
  description:         string
  category:            string | null
  city:                string | null
  budget_min:          number | null
  budget_max:          number | null
  submission_deadline: string
  bid_count:           number
  published_at:        string | null
}

function formatBudget(min: number | null, max: number | null): string | null {
  if (min && max) return `${formatXAF(min)} – ${formatXAF(max)}`
  if (min)        return `From ${formatXAF(min)}`
  if (max)        return `Up to ${formatXAF(max)}`
  return null
}

export default async function TendersPage({ searchParams }: PageProps) {
  const { city, page: pageStr } = await searchParams
  const page   = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE
  const today  = new Date().toISOString().split('T')[0]

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from('tenders')
    .select(
      `id, title, description, category, city,
       budget_min, budget_max, submission_deadline,
       bid_count, published_at`,
      { count: 'exact' }
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (city) q = q.eq('city', city)

  const res = await q as { data: TenderRow[] | null; count: number | null }

  const tenders    = res.data ?? []
  const totalCount = res.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const cityLabel = city
    ? (CAMEROON_CITIES.find(c => c.value === city)?.label ?? city)
    : null

  function buildHref(overrides: { city?: string | null; page?: number }) {
    const params = new URLSearchParams()
    const nc = 'city' in overrides ? overrides.city : city
    const np = overrides.page ?? 1
    if (nc) params.set('city', nc)
    if (np > 1) params.set('page', String(np))
    const qs = params.toString()
    return `/tenders${qs ? `?${qs}` : ''}`
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-[#1a0505] py-12 px-4">
        <div className="max-w-5xl mx-auto space-y-3">
          <h1 className="text-3xl font-bold text-white">Tenders Board</h1>
          <p className="text-white/80 max-w-xl">
            Public tender notices for construction, supply, and service contracts across Cameroon.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Filter row */}
        <div className="flex flex-wrap gap-3 items-center">
          <form method="GET" action="/tenders" className="flex items-center gap-2">
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

        {/* Result count */}
        <p className="text-sm text-muted-foreground">
          {totalCount} tender{totalCount !== 1 ? 's' : ''}
          {cityLabel ? ` in ${cityLabel}` : ''}
        </p>

        {/* Tender list */}
        {tenders.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FileText className="mx-auto h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">No tenders match your filters.</p>
            <p className="text-sm mt-1">Try removing a filter or check back later.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tenders.map(tender => {
              const budgetStr   = formatBudget(tender.budget_min, tender.budget_max)
              const isExpired   = tender.submission_deadline < today
              const deadlineStr = new Date(tender.submission_deadline).toLocaleDateString('en-CM', {
                year: 'numeric', month: 'short', day: 'numeric',
              })
              const locLabel    = tender.city
                ? (CAMEROON_CITIES.find(c => c.value === tender.city)?.label ?? tender.city)
                : null

              return (
                <Link
                  key={tender.id}
                  href={`/tenders/${tender.id}`}
                  className="group block rounded-xl border bg-card hover:border-primary/40 transition-colors p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      {tender.category && (
                        <p className="text-xs text-muted-foreground">{tender.category}</p>
                      )}
                      <h2 className="font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {tender.title}
                      </h2>
                      <p className="text-sm text-muted-foreground line-clamp-2">{tender.description}</p>
                    </div>
                    {isExpired && (
                      <Badge variant="destructive" className="shrink-0 text-xs whitespace-nowrap">Deadline passed</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t text-xs text-muted-foreground">
                    {locLabel && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {locLabel}
                      </span>
                    )}
                    {budgetStr && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {budgetStr}
                      </span>
                    )}
                    <span className={`flex items-center gap-1 ${isExpired ? 'text-destructive' : ''}`}>
                      <Calendar className="h-3 w-3" />
                      Deadline: {deadlineStr}
                    </span>
                    {tender.bid_count > 0 && (
                      <span className="ml-auto flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {tender.bid_count} bid{tender.bid_count !== 1 ? 's' : ''}
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
