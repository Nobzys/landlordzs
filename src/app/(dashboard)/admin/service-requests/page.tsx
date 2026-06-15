import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAccessAdmin } from '@/lib/roles'
import { RequestStatusBadge } from '@/components/service-requests/RequestStatusBadge'
import { formatDate, formatXAFShort } from '@/lib/utils/format'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'
import { REQUEST_TYPES_BY_ROLE } from '@/types/service-request'

export const metadata: Metadata = { title: 'Service Requests — Admin' }

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending',     label: 'Pending' },
  { value: 'accepted',    label: 'Accepted' },
  { value: 'rejected',    label: 'Rejected' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
  { value: 'disputed',    label: 'Disputed' },
]

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'contractor',  label: 'Contractor' },
  { value: 'engineer',    label: 'Engineer' },
  { value: 'architect',   label: 'Architect' },
  { value: 'lawyer',      label: 'Lawyer' },
  { value: 'surveyor',    label: 'Surveyor' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'vendor',      label: 'Vendor' },
]

interface SearchParams { status?: string; role?: string }

export default async function AdminServiceRequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile || !canAccessAdmin(profile.role)) redirect('/login')

  const { status = '', role = '' } = await searchParams
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (adminClient as any)
    .from('service_requests')
    .select('id, title, request_type, status, budget_min, budget_max, created_at, client_id, provider_id, provider_role, notes')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)
  if (role)   query = query.eq('provider_role', role)

  const { data: requests } = await query as { data: any[] | null }
  const rows = requests ?? []

  // Batch-fetch profiles for client + provider names
  const allIds = [
    ...new Set([
      ...rows.map(r => r.client_id).filter(Boolean),
      ...rows.map(r => r.provider_id).filter(Boolean),
    ]),
  ]
  let profileMap: Record<string, string> = {}
  if (allIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (adminClient as any)
      .from('profiles')
      .select('id, full_name, display_name')
      .in('id', allIds) as { data: any[] | null }
    for (const p of profiles ?? []) {
      profileMap[p.id] = p.display_name ?? p.full_name ?? 'Unknown'
    }
  }

  const allTypes = Object.values(REQUEST_TYPES_BY_ROLE).flat()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Service Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} result{rows.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <form method="get" className="flex gap-3 flex-wrap">
          <select
            name="status"
            defaultValue={status}
            className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            name="role"
            defaultValue={role}
            className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {ROLE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Filter
          </button>
          {(status || role) && (
            <Link
              href="/admin/service-requests"
              className="rounded-md border px-4 py-1.5 text-sm hover:bg-accent transition-colors"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">No requests found</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Request</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client → Professional</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Budget</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const typeLabel = allTypes.find(t => t.value === r.request_type)?.label
                    ?? r.request_type?.replace(/_/g, ' ')
                    ?? '—'
                  const clientName   = r.client_id   ? profileMap[r.client_id]   : '—'
                  const providerName = r.provider_id  ? profileMap[r.provider_id] : '—'
                  const roleLabel    = ROLE_LABELS[r.provider_role as UserRole] ?? r.provider_role ?? '—'
                  return (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/requests/${r.id}`} className="font-medium hover:underline max-w-[200px] truncate block">
                          {r.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{typeLabel}</td>
                      <td className="px-4 py-3">
                        <RequestStatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="truncate max-w-[160px] block">
                          {clientName} → {providerName}
                          {r.provider_role && (
                            <span className="block text-xs capitalize opacity-70">{roleLabel}</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {(r.budget_min || r.budget_max)
                          ? `${r.budget_min ? formatXAFShort(r.budget_min) : '?'} – ${r.budget_max ? formatXAFShort(r.budget_max) : '?'}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(r.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
