import type { Metadata } from 'next'
import { forbidden } from 'next/navigation'
import Link from 'next/link'
import { getServerProfile } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { canRequestQuotes } from '@/lib/roles'
import { RequestStatusBadge } from '@/components/service-requests/RequestStatusBadge'
import { formatDate, formatXAFShort } from '@/lib/utils/format'
import { REQUEST_TYPES_BY_ROLE } from '@/types/service-request'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'

export const metadata: Metadata = { title: 'My Requests' }

const TABS = [
  { key: 'all',         label: 'All' },
  { key: 'pending',     label: 'Pending' },
  { key: 'accepted',    label: 'Accepted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed' },
  { key: 'cancelled',   label: 'Cancelled / Rejected' },
] as const

interface SearchParams { tab?: string }

export default async function MyRequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile) forbidden()
  if (!canRequestQuotes(profile!.role)) forbidden()

  const { tab = 'all' } = await searchParams
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('service_requests')
    .select('id, title, request_type, status, budget_min, budget_max, created_at, provider_id, provider_role, notes')
    .eq('client_id', profile!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (tab !== 'all') {
    if (tab === 'cancelled') {
      query = query.in('status', ['cancelled', 'rejected'])
    } else {
      query = query.eq('status', tab)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: requests } = await query as { data: any[] | null }
  const rows = requests ?? []

  const providerIds = [...new Set(rows.filter(r => r.provider_id).map(r => r.provider_id))]
  let providerMap: Record<string, { name: string; role: string }> = {}
  if (providerIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: providers } = await (supabase as any)
      .from('profiles')
      .select('id, full_name, display_name, role')
      .in('id', providerIds) as { data: any[] | null }
    for (const p of providers ?? []) {
      providerMap[p.id] = {
        name: p.display_name ?? p.full_name ?? 'Professional',
        role: p.role,
      }
    }
  }

  const allTypes = Object.values(REQUEST_TYPES_BY_ROLE).flat()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} request{rows.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/account/requests?tab=${t.key}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
              tab === t.key ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center space-y-2">
          <p className="text-sm font-medium text-muted-foreground">No requests found</p>
          <p className="text-xs text-muted-foreground/70">
            Browse{' '}
            <Link href="/professionals" className="underline">
              professionals
            </Link>{' '}
            to send a service request.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const prov = r.provider_id ? providerMap[r.provider_id] : null
            const typeLabel = allTypes.find(t => t.value === r.request_type)?.label
              ?? r.request_type?.replace(/_/g, ' ')
              ?? '—'
            return (
              <Link
                key={r.id}
                href={`/requests/${r.id}`}
                className="flex items-start gap-4 rounded-xl border bg-card p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{r.title}</p>
                    <RequestStatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {typeLabel}
                    {prov && ` · ${prov.name} (${ROLE_LABELS[prov.role as UserRole] ?? prov.role})`}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatDate(r.created_at)}</span>
                    {(r.budget_min || r.budget_max) && (
                      <span>
                        {r.budget_min ? formatXAFShort(r.budget_min) : '?'} – {r.budget_max ? formatXAFShort(r.budget_max) : '?'}
                      </span>
                    )}
                  </div>
                  {r.notes && r.status === 'rejected' && (
                    <p className="text-xs text-muted-foreground italic">Declined: {r.notes}</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
