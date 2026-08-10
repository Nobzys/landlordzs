import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Eye, MessageSquare, Heart, CalendarDays, BarChart2 } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'

export const metadata: Metadata = { title: 'Listing Analytics — Seller' }

type PropertyAnalytics = {
  id: string
  title: string
  slug: string
  owner_id: string
  view_count: number
  enquiry_count: number
  published_at: string | null
  status: string
}

type ViewRow = {
  created_at: string
}

function groupByDay(views: ViewRow[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const v of views) {
    const day = v.created_at.slice(0, 10)
    result[day] = (result[day] ?? 0) + 1
  }
  return result
}

function buildLast30Days(): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function daysActive(publishedAt: string | null): number | null {
  if (!publishedAt) return null
  const ms = Date.now() - new Date(publishedAt).getTime()
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export default async function ListingAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getServerProfile()
  if (!profile || !['seller', 'agent', 'admin'].includes(profile.role)) redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: property } = await (supabase as any)
    .from('properties')
    .select('id, title, slug, owner_id, view_count, enquiry_count, published_at, status')
    .eq('id', id)
    .eq('owner_id', profile.id)
    .single() as { data: PropertyAnalytics | null }

  if (!property) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: favoriteCount } = await (supabase as any)
    .from('property_favorites')
    .select('user_id', { count: 'exact', head: true })
    .eq('property_id', id) as { count: number | null }

  // Last 30 days of property_views (propview_select RLS allows owner)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentViews } = await (supabase as any)
    .from('property_views')
    .select('created_at')
    .eq('property_id', id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true }) as { data: ViewRow[] | null }

  const days30 = buildLast30Days()
  const grouped = groupByDay(recentViews ?? [])
  const dailyData = days30.map((day) => ({ day, count: grouped[day] ?? 0 }))
  const maxViews = Math.max(...dailyData.map((d) => d.count), 1)

  const activeDays = daysActive(property.published_at)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href={`/seller/listings/${id}/edit`}
          className="mt-1 flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted/50 transition-colors"
          aria-label="Back to listing"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Analytics</h1>
              <p className="text-sm text-muted-foreground truncate">{property.title}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border p-4 text-center">
          <Eye className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
          <p className="text-2xl font-bold">{property.view_count.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Total views</p>
        </div>
        <div className="rounded-xl border p-4 text-center">
          <MessageSquare className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
          <p className="text-2xl font-bold">{property.enquiry_count}</p>
          <p className="text-xs text-muted-foreground mt-1">Inquiries</p>
        </div>
        <div className="rounded-xl border p-4 text-center">
          <Heart className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
          <p className="text-2xl font-bold">{favoriteCount ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Saved by</p>
        </div>
        <div className="rounded-xl border p-4 text-center">
          <CalendarDays className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
          <p className="text-2xl font-bold">{activeDays ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {property.status === 'active' ? 'Days active' : 'Days published'}
          </p>
        </div>
      </div>

      {/* Views timeline */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Views — last 30 days</h2>
          <p className="text-xs text-muted-foreground">
            {(recentViews ?? []).length} views in this period
          </p>
        </div>

        <div className="rounded-xl border p-4 space-y-2">
          {/* Bar chart */}
          <div className="flex items-end gap-0.5 h-32">
            {dailyData.map(({ day, count }) => {
              const heightPct = maxViews > 0 ? (count / maxViews) * 100 : 0
              return (
                <div key={day} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative">
                  <div
                    className="w-full bg-primary/20 group-hover:bg-primary/40 rounded-t transition-colors"
                    style={{ height: `${heightPct}%`, minHeight: count > 0 ? '2px' : '0' }}
                    title={`${day}: ${count} view${count !== 1 ? 's' : ''}`}
                  />
                </div>
              )
            })}
          </div>

          {/* X-axis labels — show only start, mid, end */}
          <div className="flex justify-between text-[10px] text-muted-foreground px-0">
            <span>{days30[0]?.slice(5)}</span>
            <span>{days30[14]?.slice(5)}</span>
            <span>{days30[29]?.slice(5)}</span>
          </div>
        </div>

        {(recentViews ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No views recorded in the last 30 days.
          </p>
        )}
      </section>

      {/* Conversion ratio */}
      {property.view_count > 0 && (
        <section className="rounded-xl border p-4 space-y-1">
          <h2 className="text-sm font-semibold">Conversion</h2>
          <p className="text-xs text-muted-foreground">
            Inquiry rate:{' '}
            <span className="text-foreground font-medium">
              {((property.enquiry_count / property.view_count) * 100).toFixed(1)}%
            </span>{' '}
            ({property.enquiry_count} inquiries from {property.view_count.toLocaleString()} views)
          </p>
          {/* Progress bar */}
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{
                width: `${Math.min(
                  (property.enquiry_count / property.view_count) * 100 * 10,
                  100
                )}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Bar scaled to 10% = full width for readability
          </p>
        </section>
      )}
    </div>
  )
}
