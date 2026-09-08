import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { LinkButton } from '@/components/ui/link-button'
import { ServiceRequestCard } from '@/components/services/ServiceRequestCard'
import type { ServiceRequestSummary } from '@/components/services/ServiceRequestCard'
import { CAMEROON_CITIES } from '@/lib/utils/constants'

export const metadata: Metadata = { title: 'Service Requests — LandLordz' }

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
  }>
}

export default async function ServicesPage({ searchParams }: PageProps) {
  const { city, category } = await searchParams
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let requestQuery = (supabase as any)
    .from('service_requests')
    .select(`
      id, title, description, city, budget_min, budget_max, deadline, status, created_at,
      service_categories(name)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50)

  if (city)     requestQuery = requestQuery.eq('city', city)
  if (category) requestQuery = requestQuery.eq('category_id', category)

  const [{ data }, catsRes] = await Promise.all([
    requestQuery as Promise<{ data: RequestRow[] | null }>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('service_categories')
      .select('id, name')
      .order('name') as Promise<{ data: CategoryRow[] | null }>,
  ])

  const requests: ServiceRequestSummary[] = (data ?? []).map(r => ({
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

  const categories    = catsRes.data ?? []
  const hasFilter     = !!(city || category)
  const cityLabel     = city ? (CAMEROON_CITIES.find(c => c.value === city)?.label ?? city) : null
  const categoryLabel = category ? (categories.find(c => c.id === category)?.name ?? null) : null

  function buildHref(overrides: { city?: string | null; category?: string | null }) {
    const params = new URLSearchParams()
    const nc = 'city'     in overrides ? overrides.city     : city
    const nk = 'category' in overrides ? overrides.category : category
    if (nc) params.set('city', nc)
    if (nk) params.set('category', nk)
    const qs = params.toString()
    return `/services${qs ? `?${qs}` : ''}`
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
          <aside className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-4 lg:self-start">
            <div className="p-4 rounded-xl border bg-card space-y-5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Search Filters</span>
                {hasFilter && (
                  <Link href="/services" className="text-xs text-[#B71C1C] hover:underline">
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
                  <div className="flex flex-col gap-1.5">
                    <Link
                      href={buildHref({ category: null })}
                      className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        !category
                          ? 'bg-[#B71C1C] text-white'
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      All categories
                    </Link>
                    {categories.map(cat => (
                      <Link
                        key={cat.id}
                        href={buildHref({ category: cat.id })}
                        className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          category === cat.id
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Location */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Location
                </p>
                <form method="GET" action="/services" className="space-y-2">
                  {category && <input type="hidden" name="category" value={category} />}
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
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 rounded-md bg-[#B71C1C] text-white px-3 py-1.5 text-sm font-medium hover:bg-[#9b1515] transition-colors"
                    >
                      Apply
                    </button>
                    {city && (
                      <Link
                        href={buildHref({ city: null })}
                        className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors text-muted-foreground"
                      >
                        Clear
                      </Link>
                    )}
                  </div>
                </form>
              </div>

              {/* Post CTA */}
              <div className="border-t pt-4">
                <LinkButton href="/services/new" className="w-full text-center">
                  Post a Request
                </LinkButton>
              </div>
            </div>
          </aside>

          {/* ── Main content ─────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-muted-foreground">
                {requests.length} open request{requests.length !== 1 ? 's' : ''}
                {categoryLabel ? ` · ${categoryLabel}` : ''}
                {cityLabel     ? ` in ${cityLabel}` : ''}
              </p>
              <LinkButton href="/services/new" className="hidden sm:inline-flex">
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
                {!hasFilter && <LinkButton href="/services/new">Post a Request</LinkButton>}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {requests.map(r => (
                  <ServiceRequestCard key={r.id} request={r} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
