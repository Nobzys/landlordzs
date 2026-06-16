import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Search, TrendingUp, Eye, BarChart2 } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Search Analytics — Admin' }

interface SearchParams { days?: string }

export default async function SearchAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const { days } = await searchParams
  const daysBack = parseInt(days ?? '30', 10) || 30
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

  const adminClient = createAdminClient()

  // Top search queries
  const { data: topQueries } = await (adminClient as any)
    .from('search_analytics')
    .select('query, count:id.count()')
    .gte('created_at', since)
    .not('query', 'is', null)
    .order('count', { ascending: false })
    .limit(20) as { data: { query: string; count: number }[] | null }

  // Searches by entity type
  const { data: byType } = await (adminClient as any)
    .from('search_analytics')
    .select('entity_type, count:id.count()')
    .gte('created_at', since)
    .order('count', { ascending: false }) as {
      data: { entity_type: string; count: number }[] | null
    }

  // Total searches
  const { count: totalSearches } = await (adminClient as any)
    .from('search_analytics')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since) as { count: number | null }

  // Zero-result searches
  const { count: zeroResults } = await (adminClient as any)
    .from('search_analytics')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since)
    .eq('result_count', 0) as { count: number | null }

  // Most viewed properties (from recently_viewed)
  const { data: topProperties } = await (adminClient as any)
    .from('recently_viewed')
    .select('entity_id, count:id.count(), properties:entity_id(id, title, city)')
    .eq('entity_type', 'property')
    .gte('viewed_at', since)
    .order('count', { ascending: false })
    .limit(10) as {
      data: { entity_id: string; count: number; properties: { id: string; title: string; city: string } | null }[] | null
    }

  // Most viewed professionals
  const { data: topProfessionals } = await (adminClient as any)
    .from('recently_viewed')
    .select('entity_id, count:id.count(), profiles:entity_id(id, full_name, display_name, role)')
    .eq('entity_type', 'professional')
    .gte('viewed_at', since)
    .order('count', { ascending: false })
    .limit(10) as {
      data: { entity_id: string; count: number; profiles: { id: string; full_name: string | null; display_name: string | null; role: string } | null }[] | null
    }

  const total  = totalSearches ?? 0
  const noRes  = zeroResults  ?? 0
  const zeroRate = total > 0 ? ((noRes / total) * 100).toFixed(1) : '0'

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BarChart2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Search Analytics</h1>
          <p className="text-sm text-muted-foreground">Last {daysBack} days</p>
        </div>

        <div className="ml-auto">
          <form method="get">
            <select
              name="days"
              defaultValue={daysBack.toString()}
              onChange={(e) => (e.target.form as HTMLFormElement).submit()}
              className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </form>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Search className="h-5 w-5" />} label="Total Searches" value={total.toLocaleString()} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Zero-Result Rate" value={`${zeroRate}%`} />
        <StatCard icon={<Eye className="h-5 w-5" />} label="Property Views" value={(topProperties ?? []).reduce((a, r) => a + Number(r.count), 0).toLocaleString()} />
        <StatCard icon={<Eye className="h-5 w-5" />} label="Professional Views" value={(topProfessionals ?? []).reduce((a, r) => a + Number(r.count), 0).toLocaleString()} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top queries */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Top Search Queries
          </h2>
          {(topQueries ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <div className="space-y-2">
              {(topQueries ?? []).map((q, i) => (
                <div key={q.query} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                  <span className="flex-1 text-sm truncate">&ldquo;{q.query}&rdquo;</span>
                  <span className="text-sm font-semibold">{Number(q.count).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Searches by type */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Searches by Category</h2>
          {(byType ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <div className="space-y-2">
              {(byType ?? []).map((t) => (
                <div key={t.entity_type} className="flex items-center gap-3">
                  <span className="flex-1 text-sm capitalize">{t.entity_type}</span>
                  <span className="text-sm font-semibold">{Number(t.count).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most viewed properties */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Most Viewed Properties
          </h2>
          {(topProperties ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No views tracked yet</p>
          ) : (
            <div className="space-y-2">
              {(topProperties ?? []).map((r, i) => (
                <div key={r.entity_id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{r.properties?.title ?? r.entity_id}</p>
                    {r.properties?.city && (
                      <p className="text-xs text-muted-foreground">{r.properties.city}</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold">{Number(r.count)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most viewed professionals */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Most Viewed Professionals
          </h2>
          {(topProfessionals ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No views tracked yet</p>
          ) : (
            <div className="space-y-2">
              {(topProfessionals ?? []).map((r, i) => {
                const name = r.profiles?.display_name ?? r.profiles?.full_name ?? r.entity_id
                return (
                  <div key={r.entity_id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{name}</p>
                      {r.profiles?.role && (
                        <p className="text-xs text-muted-foreground capitalize">{r.profiles.role}</p>
                      )}
                    </div>
                    <span className="text-sm font-semibold">{Number(r.count)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-sm">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
