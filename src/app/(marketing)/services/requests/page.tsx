import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ServiceRequestCard } from '@/components/services/ServiceRequestCard'
import type { ServiceRequestSummary } from '@/components/services/ServiceRequestCard'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { ListingPagination } from '@/components/ui/listing-pagination'
import { LinkButton } from '@/components/ui/link-button'

export const metadata: Metadata = { title: 'Service Requests — LandLordz' }

const PAGE_SIZE = 8

type RequestRow = {
  id:          string
  title:       string
  description: string
  city:        string | null
  budget_min:  number | null
  budget_max:  number | null
  deadline:    string | null
  status:      string
  created_at:  string
  service_categories: { name: string } | null
}

type CategoryRow = { id: string; name: string }

interface PageProps {
  searchParams: Promise<{
    city?:     string
    category?: string
    page?:     string
  }>
}

export default async function ServicesRequestsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const city     = sp.city     || null
  const category = sp.category || null
  const page     = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const offset   = (page - 1) * PAGE_SIZE

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  let requestQuery = supabase
    .from('service_requests')
    .select(
      `id, title, description, city, budget_min, budget_max, deadline, status, created_at,
       service_categories(name)`,
      { count: 'exact' }
    )
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (city)     requestQuery = requestQuery.eq('city', city)
  if (category) requestQuery = requestQuery.eq('category_id', category)

  const [requestRes, catsRes] = await Promise.all([
    requestQuery as Promise<{ data: RequestRow[] | null; count: number | null }>,
    supabase
      .from('service_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order') as Promise<{ data: CategoryRow[] | null }>,
  ])

  const requests: ServiceRequestSummary[] = (requestRes.data ?? []).map(r => ({
    id:          r.id,
    title:       r.title,
    description: r.description,
    city:        r.city,
    budget_min:  r.budget_min,
    budget_max:  r.budget_max,
    deadline:    r.deadline,
    status:      r.status,
    created_at:  r.created_at,
    category:    r.service_categories,
  }))

  const totalCount = requestRes.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const categories = catsRes.data ?? []
  const hasFilter  = !!(city || category)

  const cityLabel     = city     ? (CAMEROON_CITIES.find(c => c.value === city)?.label ?? city) : null
  const categoryLabel = category ? (categories.find(c => c.id === category)?.name ?? null) : null

  function buildHref(p: number) {
    const params = new URLSearchParams()
    if (city)     params.set('city',     city)
    if (category) params.set('category', category)
    if (p > 1)    params.set('page',     String(p))
    const qs = params.toString()
    return `/services/requests${qs ? `?${qs}` : ''}`
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-[#1a0505] py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-3">
          <h1 className="text-3xl font-bold text-white">Service Requests</h1>
          <p className="text-white/80 max-w-xl">
            Open requests from clients across Cameroon — browse and submit your quotation.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <aside className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
            <form method="GET" action="/services/requests">
              <div className="p-4 rounded-xl border bg-card space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Search Filters</span>
                  {hasFilter && (
                    <Link href="/services/requests" className="text-xs text-[#B71C1C] hover:underline">
                      Reset
                    </Link>
                  )}
                </div>

                {/* Category */}
                {categories.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Service Category
                    </p>
                    <select
                      name="category"
                      defaultValue={category ?? ''}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">All categories</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                )}

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
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-muted-foreground">
                {totalCount.toLocaleString()} open request{totalCount !== 1 ? 's' : ''}
                {categoryLabel ? ` · ${categoryLabel}` : ''}
                {cityLabel     ? ` in ${cityLabel}` : ''}
              </p>
              <LinkButton href="/services/requests/new" className="hidden sm:inline-flex">
                Post a Request
              </LinkButton>
            </div>

            {requests.length === 0 ? (
              <div className="text-center py-16 border rounded-xl text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium mb-1">No open service requests</p>
                <p className="text-sm mb-4">
                  {hasFilter ? 'Try removing a filter.' : 'Be the first to post a service request.'}
                </p>
                {!hasFilter && <LinkButton href="/services/requests/new">Post a Request</LinkButton>}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {requests.map(r => (
                  <ServiceRequestCard key={r.id} request={r} />
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
