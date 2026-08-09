import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ScrollText, Shield, Activity, ChevronRight } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { formatDate, formatRelative } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Audit Logs — Admin' }

const ACTION_COLOR: Record<string, string> = {
  approve_professional: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  reject_professional:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  suspend_account:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  activate_account:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  assign_role:          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  request_more_info:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

const KNOWN_ACTIONS = [
  'approve_professional',
  'reject_professional',
  'suspend_account',
  'activate_account',
  'assign_role',
  'request_more_info',
]

type AdminLogRow = {
  id: string
  action: string
  actor_id: string
  target_type: string | null
  target_id: string | null
  new_data: Record<string, unknown> | null
  created_at: string
}

type ActivityLogRow = {
  id: string
  action: string
  user_id: string | null
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

type ActorMap = Record<string, string>

interface SearchParams {
  tab?: string
  action?: string
  from?: string
  to?: string
  target_type?: string
}

function targetLink(row: AdminLogRow): string | null {
  if (!row.target_id) return null
  if (row.target_type === 'profile') return `/admin/users/${row.target_id}`
  if (row.target_type === 'kyc_record') return `/admin/verifications/${row.target_id}`
  return null
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const [profile, sp] = await Promise.all([getServerProfile(), searchParams])
  if (!profile || profile.role !== 'admin') redirect('/login')

  const tab         = sp.tab === 'activity' ? 'activity' : 'admin'
  const actionFilter = sp.action?.trim() || undefined
  const fromDate     = sp.from?.trim() || undefined
  const toDate       = sp.to?.trim() || undefined
  const targetType   = sp.target_type?.trim() || undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  let adminLogs: AdminLogRow[] = []
  let activityLogs: ActivityLogRow[] = []
  let actorMap: ActorMap = {}

  if (tab === 'activity') {
    let q = admin
      .from('activity_logs')
      .select('id, action, user_id, entity_type, entity_id, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (actionFilter) q = q.eq('action', actionFilter)
    if (fromDate) q = q.gte('created_at', fromDate)
    if (toDate)   q = q.lte('created_at', toDate + 'T23:59:59Z')
    const { data } = await q
    activityLogs = (data as ActivityLogRow[]) ?? []

    const userIds = [...new Set(activityLogs.map(l => l.user_id).filter((id): id is string => !!id))]
    if (userIds.length > 0) {
      const { data: users } = await admin
        .from('profiles')
        .select('id, full_name, display_name, email')
        .in('id', userIds)
      for (const u of (users ?? [])) {
        actorMap[u.id] = u.full_name?.trim() || u.display_name?.trim() || u.email || 'Unknown'
      }
    }
  } else {
    let q = admin
      .from('admin_logs')
      .select('id, action, actor_id, target_type, target_id, new_data, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (actionFilter) q = q.eq('action', actionFilter)
    if (fromDate) q = q.gte('created_at', fromDate)
    if (toDate)   q = q.lte('created_at', toDate + 'T23:59:59Z')
    if (targetType) q = q.eq('target_type', targetType)
    const { data } = await q
    adminLogs = (data as AdminLogRow[]) ?? []

    const actorIds = [...new Set(adminLogs.map(l => l.actor_id).filter(Boolean))]
    if (actorIds.length > 0) {
      const { data: actors } = await admin
        .from('profiles')
        .select('id, full_name, display_name, email')
        .in('id', actorIds)
      for (const a of (actors ?? [])) {
        actorMap[a.id] = a.full_name?.trim() || a.display_name?.trim() || a.email || 'Unknown'
      }
    }
  }

  const isFiltered = !!(actionFilter || fromDate || toDate || (tab === 'admin' && targetType))

  function buildUrl(overrides: Partial<SearchParams> & { tab?: string }): string {
    const merged: Record<string, string | undefined> = {
      tab,
      action: actionFilter,
      from: fromDate,
      to: toDate,
      target_type: targetType,
      ...overrides,
    }
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v)
    }
    const str = params.toString()
    return `/admin/logs${str ? `?${str}` : ''}`
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
          <ScrollText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Platform activity and admin action history</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b">
        {([
          { key: 'admin',    label: 'Admin Actions' },
          { key: 'activity', label: 'User Activity' },
        ] as const).map(({ key, label }) => (
          <Link
            key={key}
            href={buildUrl({ tab: key, action: undefined, target_type: undefined })}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Filters */}
      <form method="GET" action="/admin/logs" className="flex flex-wrap gap-3 items-end">
        <input type="hidden" name="tab" value={tab} />

        {tab === 'admin' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Action type</label>
              <select
                name="action"
                defaultValue={actionFilter ?? ''}
                className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All actions</option>
                {KNOWN_ACTIONS.map(a => (
                  <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Target type</label>
              <select
                name="target_type"
                defaultValue={targetType ?? ''}
                className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All targets</option>
                <option value="profile">Profile</option>
                <option value="kyc_record">KYC Record</option>
              </select>
            </div>
          </>
        )}

        {tab === 'activity' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Action type</label>
            <input
              name="action"
              type="text"
              defaultValue={actionFilter ?? ''}
              placeholder="e.g. user_registered"
              className="rounded-md border px-3 py-1.5 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-44"
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">From date</label>
          <input
            name="from"
            type="date"
            defaultValue={fromDate ?? ''}
            className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">To date</label>
          <input
            name="to"
            type="date"
            defaultValue={toDate ?? ''}
            className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" size="sm">Apply</Button>
          {isFiltered && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/admin/logs${tab !== 'admin' ? '?tab=activity' : ''}`}>Clear</Link>
            </Button>
          )}
        </div>
      </form>

      {/* Admin Actions table */}
      {tab === 'admin' && (
        <section className="rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Admin Actions</span>
            {isFiltered && (
              <span className="ml-auto text-xs text-muted-foreground">Filtered</span>
            )}
            {!isFiltered && adminLogs.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">{adminLogs.length} shown</span>
            )}
          </div>

          {adminLogs.length > 0 ? (
            <div className="divide-y">
              {adminLogs.map((log) => {
                const link = targetLink(log)
                const actor = actorMap[log.actor_id] ?? 'Unknown'
                const hasData = log.new_data && Object.keys(log.new_data).length > 0
                return (
                  <div key={log.id} className="flex items-start gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        {log.target_type && (
                          <span className="text-xs text-muted-foreground">
                            on {log.target_type.replace(/_/g, ' ')}
                          </span>
                        )}
                        {link && (
                          <Link
                            href={link}
                            className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                          >
                            View <ChevronRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                      <p className="text-sm">
                        by <span className="font-medium">{actor}</span>
                      </p>
                      {hasData && (
                        <p className="text-xs font-mono text-muted-foreground truncate max-w-xs sm:max-w-md">
                          {JSON.stringify(log.new_data)}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right space-y-0.5">
                      <p className="text-xs text-muted-foreground">{formatRelative(log.created_at)}</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">{formatDate(log.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-4 py-12 text-center space-y-2">
              <Shield className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                {isFiltered
                  ? 'No admin actions match the current filters.'
                  : 'No admin actions recorded yet.'}
              </p>
            </div>
          )}
        </section>
      )}

      {/* User Activity table */}
      {tab === 'activity' && (
        <section className="rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">User Activity</span>
            {isFiltered && (
              <span className="ml-auto text-xs text-muted-foreground">Filtered</span>
            )}
            {!isFiltered && activityLogs.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">{activityLogs.length} shown</span>
            )}
          </div>

          {activityLogs.length > 0 ? (
            <div className="divide-y">
              {activityLogs.map((log) => {
                const user = log.user_id ? (actorMap[log.user_id] ?? 'Unknown') : 'Deleted user'
                const hasMetadata = Object.keys(log.metadata).length > 0
                return (
                  <div key={log.id} className="flex items-start gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        {log.entity_type && (
                          <span className="text-xs text-muted-foreground">
                            {log.entity_type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">
                        by <span className="font-medium">{user}</span>
                      </p>
                      {hasMetadata && (
                        <p className="text-xs font-mono text-muted-foreground truncate max-w-xs sm:max-w-md">
                          {JSON.stringify(log.metadata)}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right space-y-0.5">
                      <p className="text-xs text-muted-foreground">{formatRelative(log.created_at)}</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">{formatDate(log.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-4 py-12 text-center space-y-2">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                {isFiltered
                  ? 'No activity matches the current filters.'
                  : 'No user activity recorded yet.'}
              </p>
            </div>
          )}
        </section>
      )}

    </div>
  )
}
