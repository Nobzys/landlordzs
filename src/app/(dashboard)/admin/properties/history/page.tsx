import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { History, ChevronLeft } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { formatRelative } from '@/lib/utils/format'
import { PROPERTY_STATUSES } from '@/lib/property-status'

export const metadata: Metadata = { title: 'Property Moderation History — Admin' }

const STATUS_COLOR: Record<string, string> = {
  draft:           'bg-gray-100 text-gray-600',
  pending_review:  'bg-amber-100 text-amber-700',
  active:          'bg-emerald-100 text-emerald-700',
  under_offer:     'bg-blue-100 text-blue-700',
  sold:            'bg-purple-100 text-purple-700',
  rented:          'bg-teal-100 text-teal-700',
  off_market:      'bg-gray-100 text-gray-600',
  expired:         'bg-orange-100 text-orange-700',
  rejected:        'bg-red-100 text-red-700',
  suspended:       'bg-red-200 text-red-800',
  archived:        'bg-gray-200 text-gray-700',
}

type HistoryRow = {
  id:          string
  old_status:  string | null
  new_status:  string
  notes:       string | null
  created_at:  string
  properties:  { id: string; title: string } | null
  admin:       { full_name: string | null; display_name: string | null; email: string | null } | null
}

interface SearchParams {
  q?:      string
  status?: string
  from?:   string
  to?:     string
  page?:   string
}

const PAGE_SIZE = 30

export default async function PropertyModerationHistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const params = await searchParams
  const q          = params.q?.trim() || undefined
  const statusFilter = (PROPERTY_STATUSES as readonly string[]).includes(params.status ?? '') ? params.status : undefined
  const dateFrom    = params.from?.trim() || undefined
  const dateTo      = params.to?.trim() || undefined
  const page        = Math.max(1, parseInt(params.page ?? '1', 10))
  const from        = (page - 1) * PAGE_SIZE
  const to          = from + PAGE_SIZE - 1

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('property_status_history')
    .select(
      `id, old_status, new_status, notes, created_at,
       properties!inner ( id, title ),
       admin:profiles!property_status_history_changed_by_fkey ( full_name, display_name, email )`,
      { count: 'exact' }
    )

  if (statusFilter) query = query.eq('new_status', statusFilter)
  if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00Z`)
  if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59Z`)
  if (q) query = query.ilike('properties.title', `%${q}%`)

  const { data: rows, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to) as { data: HistoryRow[] | null; count: number | null; error: { message: string } | null }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  function buildUrl(overrides: Partial<SearchParams>) {
    const merged = { q, status: statusFilter, from: dateFrom, to: dateTo, page: String(page), ...overrides }
    const p = new URLSearchParams()
    if (merged.q) p.set('q', merged.q)
    if (merged.status) p.set('status', merged.status)
    if (merged.from) p.set('from', merged.from)
    if (merged.to) p.set('to', merged.to)
    if (merged.page && merged.page !== '1') p.set('page', merged.page)
    const qs = p.toString()
    return `/admin/properties/history${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LinkButton href="/admin/properties" variant="ghost" size="icon" className="-ml-2">
          <ChevronLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Property Moderation History</h1>
            <p className="text-sm text-muted-foreground">{count ?? 0} status change{count === 1 ? '' : 's'}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <form className="rounded-xl border p-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search property title"
          className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select name="status" defaultValue={statusFilter ?? ''} className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All resulting statuses</option>
          {PROPERTY_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" name="from" defaultValue={dateFrom ?? ''} className="w-full rounded-md border px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          <input type="date" name="to" defaultValue={dateTo ?? ''} className="w-full rounded-md border px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="rounded-md border px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90">Apply Filters</button>
          {(q || statusFilter || dateFrom || dateTo) && (
            <LinkButton href="/admin/properties/history" variant="ghost" size="sm">Clear</LinkButton>
          )}
        </div>
      </form>

      {/* List */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 text-center py-8 text-sm text-red-700">
          Failed to load history: {error.message}
        </div>
      ) : !rows || rows.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm font-medium text-muted-foreground">No moderation history found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {q || statusFilter || dateFrom || dateTo ? 'Try clearing filters.' : 'Status changes will appear here as properties are approved, rejected, or updated.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border divide-y overflow-hidden">
          {rows.map((row) => {
            const adminName = row.admin?.full_name?.trim() || row.admin?.display_name?.trim() || row.admin?.email?.trim() || 'System'
            return (
              <div key={row.id} className="flex items-start justify-between gap-4 px-4 py-3 flex-wrap">
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium truncate">{row.properties?.title ?? 'Property removed'}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    {row.old_status && (
                      <span className={`inline-flex px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[row.old_status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {row.old_status.replace(/_/g, ' ')}
                      </span>
                    )}
                    {row.old_status && <span>→</span>}
                    <span className={`inline-flex px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[row.new_status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {row.new_status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {row.notes && <p className="text-xs text-muted-foreground">{row.notes}</p>}
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <Badge variant="outline" className="text-xs">{adminName}</Badge>
                  <p className="text-xs text-muted-foreground">{formatRelative(row.created_at)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && <LinkButton href={buildUrl({ page: String(page - 1) })} variant="outline" size="sm">Previous</LinkButton>}
            {page < totalPages && <LinkButton href={buildUrl({ page: String(page + 1) })} variant="outline" size="sm">Next</LinkButton>}
          </div>
        </div>
      )}
    </div>
  )
}
