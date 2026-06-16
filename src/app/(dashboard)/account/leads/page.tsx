import type { Metadata } from 'next'
import { forbidden } from 'next/navigation'
import Link from 'next/link'
import { getServerProfile } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { canReceiveServiceRequests, canReceiveOrders } from '@/lib/roles'
import { RequestStatusBadge } from '@/components/service-requests/RequestStatusBadge'
import { formatDate, formatXAFShort } from '@/lib/utils/format'
import { REQUEST_TYPES_BY_ROLE } from '@/types/service-request'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'

export const metadata: Metadata = { title: 'Service Requests (Leads)' }

const TABS = [
  { key: 'all',         label: 'All' },
  { key: 'pending',     label: 'New' },
  { key: 'accepted',    label: 'Accepted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed' },
  { key: 'rejected',    label: 'Declined' },
] as const

interface SearchParams { tab?: string }

export default async function ServiceLeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile) forbidden()
  if (!canReceiveServiceRequests(profile!.role) && !canReceiveOrders(profile!.role)) forbidden()

  const { tab = 'all' } = await searchParams
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('service_requests')
    .select('id, title, request_type, status, budget_min, budget_max, created_at, client_id, notes')
    .eq('provider_id', profile!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (tab !== 'all') {
    query = query.eq('status', tab)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: requests } = await query as { data: any[] | null }
  const rows = requests ?? []

  const requesterIds = [...new Set(rows.filter(r => r.client_id).map(r => r.client_id))]
  let requesterMap: Record<string, { name: string; role: string }> = {}
  if (requesterIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: requesters } = await (supabase as any)
      .from('profiles')
      .select('id, full_name, display_name, role')
      .in('id', requesterIds) as { data: any[] | null }
    for (const p of requesters ?? []) {
      requesterMap[p.id] = {
        name: p.display_name ?? p.full_name ?? 'Client',
        role: p.role,
      }
    }
  }

  const allTypes = Object.values(REQUEST_TYPES_BY_ROLE).flat()
  const pendingCount = rows.filter(r => r.status === 'pending').length

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Service Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {rows.length} request{rows.length !== 1 ? 's' : ''}
          {pendingCount > 0 && ` · ${pendingCount} awaiting response`}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/account/leads?tab=${t.key}`}
            className={`relative rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
              tab === t.key ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
            }`}
          >
            {t.label}
            {t.key === 'pending' && pendingCount > 0 && tab !== 'pending' && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center space-y-2">
          <p className="text-sm font-medium text-muted-foreground">No requests yet</p>
          <p className="text-xs text-muted-foreground/70">
            Clients will send requests through your{' '}
            <Link href="/account/profile" className="underline">public profile</Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const client = r.client_id ? requesterMap[r.client_id] : null
            const typeLabel = allTypes.find(t => t.value === r.request_type)?.label
              ?? r.request_type?.replace(/_/g, ' ')
              ?? '—'
            const isNew = r.status === 'pending'
            return (
              <Link
                key={r.id}
                href={`/requests/${r.id}`}
                className={`flex items-start gap-4 rounded-xl border p-4 hover:bg-accent/50 transition-colors ${isNew ? 'border-amber-200 bg-amber-50/30' : 'bg-card'}`}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{r.title}</p>
                    <RequestStatusBadge status={r.status} />
                    {isNew && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {typeLabel}
                    {client && ` · ${client.name} (${ROLE_LABELS[client.role as UserRole] ?? client.role})`}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatDate(r.created_at)}</span>
                    {(r.budget_min || r.budget_max) && (
                      <span>
                        {r.budget_min ? formatXAFShort(r.budget_min) : '?'} – {r.budget_max ? formatXAFShort(r.budget_max) : '?'}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
