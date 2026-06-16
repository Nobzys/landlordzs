import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Shield, Search, Download } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Audit Logs — Admin' }

const ACTION_LABELS: Record<string, string> = {
  professional_approved:   'Professional approved',
  professional_rejected:   'Professional rejected',
  escrow_dispute_resolved: 'Escrow dispute resolved',
  suspend_account:         'Account suspended',
  activate_account:        'Account activated',
  assign_role:             'Role assigned',
  property_status_changed: 'Property status changed',
}

const PAGE_SIZE = 50

interface SearchParams {
  q?:       string
  action?:  string
  entity?:  string
  from?:    string
  to?:      string
  page?:    string
  export?:  string
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const sp       = await searchParams
  const page     = Math.max(1, parseInt(sp.page ?? '1', 10))
  const from_row = (page - 1) * PAGE_SIZE
  const to_row   = from_row + PAGE_SIZE - 1

  const adminClient = createAdminClient()

  // ── Build query ────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (adminClient as any)
    .from('audit_logs')
    .select(
      `id, action_type, entity_type, entity_id, ip_address, created_at, metadata,
       admin:admin_id ( full_name, display_name, email ),
       user:user_id  ( full_name, display_name, email )`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from_row, to_row)

  if (sp.action)  query = query.eq('action_type', sp.action)
  if (sp.entity)  query = query.eq('entity_type', sp.entity)
  if (sp.from)    query = query.gte('created_at', sp.from)
  if (sp.to)      query = query.lte('created_at', sp.to + 'T23:59:59Z')

  const { data: rows, count } = await query as {
    data: Record<string, any>[] | null
    count: number | null
  }

  const logs      = rows ?? []
  const total     = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── CSV export ─────────────────────────────────────────────────────────────
  // When ?export=csv, fetch all rows and return a data URL (handled client-side via link)
  // We embed the CSV inline in the page for the download button
  const csvRows = [
    'id,action_type,entity_type,entity_id,admin,user,ip_address,created_at',
    ...logs.map((r) => [
      r.id,
      r.action_type,
      r.entity_type ?? '',
      r.entity_id   ?? '',
      (r.admin as any)?.email ?? '',
      (r.user  as any)?.email ?? '',
      r.ip_address  ?? '',
      r.created_at,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  const csvDataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvRows)}`

  // ── Distinct action types for filter dropdown ──────────────────────────────
  const { data: actionTypes } = await (adminClient as any)
    .from('audit_logs')
    .select('action_type')
    .order('action_type') as { data: { action_type: string }[] | null }

  const distinctActions = [...new Set((actionTypes ?? []).map((r) => r.action_type))]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} total events
          </p>
        </div>
        <a
          href={csvDataUrl}
          download={`audit-logs-${new Date().toISOString().slice(0, 10)}.csv`}
          className="ml-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border hover:bg-accent transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <form method="get" className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Action type</label>
          <select
            name="action"
            defaultValue={sp.action ?? ''}
            className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All actions</option>
            {distinctActions.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Entity type</label>
          <select
            name="entity"
            defaultValue={sp.entity ?? ''}
            className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All entities</option>
            {['profile', 'property', 'escrow', 'service_request', 'subscription'].map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <input
            type="date"
            name="from"
            defaultValue={sp.from ?? ''}
            className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <input
            type="date"
            name="to"
            defaultValue={sp.to ?? ''}
            className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          className="h-9 flex items-center gap-2 rounded-lg px-4 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Search className="h-4 w-4" />
          Filter
        </button>

        {(sp.action || sp.entity || sp.from || sp.to) && (
          <a href="/admin/audit-logs" className="h-9 flex items-center px-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Clear
          </a>
        )}
      </form>

      {/* Table */}
      {logs.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <Shield className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No audit events found</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['Timestamp', 'Action', 'Entity', 'Admin / User', 'IP Address'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => {
                  const actor = (log.admin as any) ?? (log.user as any)
                  const actorName = actor?.display_name ?? actor?.full_name ?? actor?.email ?? '—'
                  return (
                    <tr key={log.id as string} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(log.created_at as string)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs">
                          {ACTION_LABELS[log.action_type as string] ?? (log.action_type as string)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.entity_type
                          ? <span className="capitalize">{log.entity_type as string}</span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3">{actorName}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        {(log.ip_address as string | null) ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`/admin/audit-logs?page=${page - 1}${sp.action ? `&action=${sp.action}` : ''}${sp.entity ? `&entity=${sp.entity}` : ''}`}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                Previous
              </a>
            )}
            {page < totalPages && (
              <a
                href={`/admin/audit-logs?page=${page + 1}${sp.action ? `&action=${sp.action}` : ''}${sp.entity ? `&entity=${sp.entity}` : ''}`}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
