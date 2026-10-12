import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { BarChart2 } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { RangePicker } from './RangePicker'
import type { ChartDataPoint } from '@/components/admin/ReportChart'

export const metadata: Metadata = { title: 'Analytics' }

// Recharts uses browser APIs; disable SSR for the chart component.
const ReportChart = dynamic(
  () => import('@/components/admin/ReportChart').then(m => m.ReportChart),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground animate-pulse">Loading chart…</div> }
)

// ── helpers ──────────────────────────────────────────────────────────────────

function isoWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `W${weekNum}`
}

function fillDays(counts: Record<string, number>, rangeMs: number): ChartDataPoint[] {
  const result: ChartDataPoint[] = []
  const now = Date.now()
  for (let i = Math.floor(rangeMs / 86400000) - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000)
    const key = d.toISOString().slice(0, 10)
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    result.push({ name: label, value: counts[key] ?? 0 })
  }
  return result
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const profile = await getServerProfile()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) redirect('/login')

  const params = await searchParams
  const rawRange = Number(params.range)
  const range = [30, 60, 90].includes(rawRange) ? rawRange : 30
  const rangeMs = range * 24 * 60 * 60 * 1000
  const since = new Date(Date.now() - rangeMs).toISOString()
  const twelveWeeksAgo = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString()

  const supabase = await createClient()
  const sb = supabase as any

  const [
    { data: rawProfiles },
    { data: rawTxns },
    { data: rawProfs },
    { data: rawEscrows },
  ] = await Promise.all([
    sb.from('profiles').select('created_at').gte('created_at', since),
    sb
      .from('wallet_transactions')
      .select('amount, created_at')
      .eq('type', 'credit')
      .gte('created_at', twelveWeeksAgo),
    sb
      .from('professional_profiles')
      .select('id, profession_type, rating_avg, rating_count, profiles(full_name, display_name)')
      .gt('rating_count', 0)
      .order('rating_avg', { ascending: false })
      .limit(10),
    sb.from('escrow_accounts').select('status'),
  ])

  // ── new users per day ─────────────────────────────────────────────────────
  const userCounts: Record<string, number> = {}
  for (const p of rawProfiles ?? []) {
    const day = (p.created_at as string).slice(0, 10)
    userCounts[day] = (userCounts[day] ?? 0) + 1
  }
  const usersByDay = fillDays(userCounts, rangeMs)
  const totalNewUsers = (rawProfiles ?? []).length

  // ── revenue by week ───────────────────────────────────────────────────────
  const weekRevenue: Record<string, number> = {}
  for (const t of rawTxns ?? []) {
    const key = isoWeekLabel(new Date(t.created_at as string))
    weekRevenue[key] = (weekRevenue[key] ?? 0) + (t.amount as number)
  }
  const revenueByWeek: ChartDataPoint[] = Object.entries(weekRevenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => ({ name, value }))
  const totalRevenue = (rawTxns ?? []).reduce((s: number, t: any) => s + (t.amount as number), 0)

  // ── top professionals ────────────────────────────────────────────────────
  type ProfRow = { id: string; profession_type: string; rating_avg: number; rating_count: number; profiles: { full_name: string | null; display_name: string | null } | null }
  const topProfessionals: ProfRow[] = rawProfs ?? []

  // ── escrows by status ─────────────────────────────────────────────────────
  const escrowCounts: Record<string, number> = {}
  for (const e of rawEscrows ?? []) {
    escrowCounts[e.status as string] = (escrowCounts[e.status as string] ?? 0) + 1
  }
  const escrowsByStatus: ChartDataPoint[] = Object.entries(escrowCounts).map(([name, value]) => ({ name, value }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground">Platform trends and metrics</p>
          </div>
        </div>
        <RangePicker current={range} />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">New Users</p>
          <p className="text-3xl font-bold">{totalNewUsers}</p>
          <p className="text-xs text-muted-foreground mt-1">last {range} days</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">Revenue (12wks)</p>
          <p className="text-2xl font-bold">XAF {totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">wallet credits</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">Total Escrows</p>
          <p className="text-3xl font-bold">{(rawEscrows ?? []).length}</p>
          <p className="text-xs text-muted-foreground mt-1">all time</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">Top Professionals</p>
          <p className="text-3xl font-bold">{topProfessionals.length}</p>
          <p className="text-xs text-muted-foreground mt-1">with ratings</p>
        </div>
      </div>

      {/* New user registrations */}
      <div className="rounded-xl border p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">New User Registrations</h2>
          <p className="text-xs text-muted-foreground">Daily signups over the last {range} days</p>
        </div>
        <ReportChart type="line" data={usersByDay} color="#4f46e5" />
      </div>

      {/* Revenue trend */}
      <div className="rounded-xl border p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Revenue Trend</h2>
          <p className="text-xs text-muted-foreground">Wallet credit totals by ISO week (last 12 weeks)</p>
        </div>
        <ReportChart type="area" data={revenueByWeek} color="#10b981" />
      </div>

      {/* Escrows by status */}
      <div className="rounded-xl border p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Active Escrows by Status</h2>
          <p className="text-xs text-muted-foreground">All escrow accounts grouped by current status</p>
        </div>
        <ReportChart type="bar" data={escrowsByStatus} color="#f59e0b" />
      </div>

      {/* Top professionals */}
      <div className="rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Top Professionals by Rating</h2>
          <p className="text-xs text-muted-foreground">Highest-rated professionals with at least one review</p>
        </div>
        {topProfessionals.length > 0 ? (
          <div className="divide-y">
            {topProfessionals.map((p) => {
              const name = p.profiles?.full_name ?? p.profiles?.display_name ?? 'Unknown'
              const stars = '★'.repeat(Math.round(p.rating_avg)) + '☆'.repeat(5 - Math.round(p.rating_avg))
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{p.profession_type}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-amber-500">{stars}</p>
                    <p className="text-xs text-muted-foreground">{p.rating_avg.toFixed(1)} · {p.rating_count} review{p.rating_count === 1 ? '' : 's'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No rated professionals yet.</p>
        )}
      </div>
    </div>
  )
}
