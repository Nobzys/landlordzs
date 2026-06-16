import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { Flag, ChevronLeft, CheckCircle2, XCircle, Clock, BarChart3, Download } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatRelative } from '@/lib/utils/format'
import { canAccessAdmin } from '@/lib/roles'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'

export const metadata: Metadata = { title: 'Reports — Admin' }

// ─── Moderation types ──────────────────────────────────────────────────────────

const MOD_STATUS_TABS = ['pending', 'reviewing', 'resolved', 'dismissed'] as const
type ReportStatus = (typeof MOD_STATUS_TABS)[number]

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  reviewing: 'bg-blue-100 text-blue-700',
  resolved:  'bg-emerald-100 text-emerald-700',
  dismissed: 'bg-gray-100 text-gray-600',
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  fake_listing:          'Fake listing',
  fraud:                 'Fraud',
  inappropriate_content: 'Inappropriate content',
  harassment:            'Harassment',
  fake_professional:     'Fake professional',
  scam:                  'Scam',
  duplicate:             'Duplicate',
  other:                 'Other',
}

type ReporterProfile = { full_name: string | null; email: string }
type ReportRow = {
  id: string; target_type: string; target_id: string; report_type: string
  reason: string; evidence_urls: string[]; status: string; resolution: string | null
  action_taken: string | null; reported_at: string; reviewed_at: string | null
  reporter: ReporterProfile | ReporterProfile[] | null
}
type ReportRowNorm = Omit<ReportRow, 'reporter'> & { reporter: ReporterProfile | null }

// ─── Analytics types ───────────────────────────────────────────────────────────

type AnalyticsUser = {
  id: string
  full_name: string | null
  email: string
  role: string
  account_status: string
  created_at: string
  subscription_status: string | null
  subscription_expires_at: string | null
}

// ─── Page ──────────────────────────────────────────────────────────────────────

interface SearchParams {
  view?:       string
  tab?:        string
  from?:       string
  to?:         string
  role?:       string
  sub_status?: string
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile || !canAccessAdmin(profile.role)) redirect('/login')

  const params = await searchParams
  const view   = params.view === 'analytics' ? 'analytics' : 'moderation'

  const adminClient = createAdminClient()

  // ─── Moderation reports ────────────────────────────────────────────────────
  const tab: ReportStatus =
    MOD_STATUS_TABS.includes(params.tab as ReportStatus)
      ? (params.tab as ReportStatus)
      : 'pending'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawReports } = await (adminClient as any)
    .from('moderation_reports')
    .select(`
      id, target_type, target_id, report_type,
      reason, evidence_urls, status, resolution, action_taken,
      reported_at, reviewed_at,
      reporter:profiles!reporter_id ( full_name, email )
    `)
    .eq('status', tab)
    .order('reported_at', { ascending: tab === 'pending' || tab === 'reviewing' })
    .limit(100) as { data: ReportRow[] | null }

  const reports: ReportRowNorm[] = (rawReports ?? []).map((r) => ({
    ...r,
    reporter: Array.isArray(r.reporter) ? (r.reporter[0] ?? null) : r.reporter,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: pendingCount } = await (adminClient as any)
    .from('moderation_reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  // ─── Analytics: user/subscription report ──────────────────────────────────
  const ANALYTICS_ROLES = ['seller', 'agent', 'vendor', 'contractor', 'engineer', 'architect', 'lawyer', 'developer', 'property_manager', 'surveyor', 'maintenance'] as const
  const SUB_STATUSES    = ['active', 'expired', 'cancelled', 'pending', 'past_due'] as const

  const fromDate   = params.from       ?? ''
  const toDate     = params.to         ?? ''
  const roleFilter = params.role       ?? ''
  const subFilter  = params.sub_status ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let analyticsQuery = (adminClient as any)
    .from('profiles')
    .select(`id, full_name, email, role, account_status, created_at, subscriptions!left ( status, expires_at )`)
    .neq('role', 'admin')
    .order('created_at', { ascending: false })
    .limit(200)

  if (roleFilter) analyticsQuery = analyticsQuery.eq('role', roleFilter)
  if (fromDate)   analyticsQuery = analyticsQuery.gte('created_at', fromDate)
  if (toDate)     analyticsQuery = analyticsQuery.lte('created_at', toDate + 'T23:59:59Z')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawUsers } = await analyticsQuery as { data: any[] | null }

  const analyticsUsers: AnalyticsUser[] = (rawUsers ?? []).map((u) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = Array.isArray(u.subscriptions) ? (u.subscriptions as any[])[0] : u.subscriptions
    return {
      id:                       u.id,
      full_name:                u.full_name,
      email:                    u.email,
      role:                     u.role,
      account_status:           u.account_status,
      created_at:               u.created_at,
      subscription_status:      sub?.status      ?? null,
      subscription_expires_at:  sub?.expires_at  ?? null,
    }
  }).filter((u) => {
    if (!subFilter) return true
    if (subFilter === '__none') return !u.subscription_status
    return u.subscription_status === subFilter
  })

  // Build CSV data string for client-side download
  const csvRows = [
    'ID,Full Name,Email,Role,Account Status,Subscription Status,Subscription Expires,Joined',
    ...analyticsUsers.map((u) => [
      u.id,
      `"${(u.full_name ?? '').replace(/"/g, '""')}"`,
      u.email,
      u.role,
      u.account_status,
      u.subscription_status ?? '',
      u.subscription_expires_at ?? '',
      u.created_at,
    ].join(',')),
  ].join('\n')
  const csvDataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvRows)}`

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/admin"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${view === 'analytics' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
            {view === 'analytics' ? <BarChart3 className="h-5 w-5" /> : <Flag className="h-5 w-5" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {view === 'analytics' ? 'Analytics Report' : 'Moderation Reports'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {view === 'analytics'
                ? `${analyticsUsers.length} users matching filters`
                : `${reports.length} ${tab} report${reports.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-2">
        <Link
          href="/admin/reports?view=moderation"
          className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors flex items-center gap-2 ${
            view === 'moderation' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
          }`}
        >
          <Flag className="h-4 w-4" />
          Moderation
          {(pendingCount ?? 0) > 0 && (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {(pendingCount as number) > 9 ? '9+' : pendingCount}
            </span>
          )}
        </Link>
        <Link
          href="/admin/reports?view=analytics"
          className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors flex items-center gap-2 ${
            view === 'analytics' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Analytics
        </Link>
      </div>

      {/* ── MODERATION TAB ────────────────────────────────────────────────────── */}
      {view === 'moderation' && (
        <>
          <div className="flex gap-2 flex-wrap">
            {MOD_STATUS_TABS.map((s) => (
              <Link
                key={s}
                href={`/admin/reports?view=moderation&tab=${s}`}
                className={`relative rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors capitalize ${
                  tab === s ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                }`}
              >
                {s}
                {s === 'pending' && (pendingCount ?? 0) > 0 && (
                  <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {(pendingCount as number) > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {reports.length === 0 ? (
            <div className="rounded-xl border text-center py-16">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-60" />
              <p className="text-sm font-medium text-muted-foreground capitalize">No {tab} reports</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => {
                const reportId     = r.id
                const reporterName = r.reporter?.full_name ?? r.reporter?.email ?? 'Unknown'
                return (
                  <div key={r.id} className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[r.status] ?? 'bg-gray-100'}`}>
                          {r.status}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {REPORT_TYPE_LABELS[r.report_type] ?? r.report_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">
                          Target: {r.target_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm">{r.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Reported by {reporterName} · {formatRelative(r.reported_at)}
                        {r.reviewed_at && ` · Reviewed ${formatRelative(r.reviewed_at)}`}
                      </p>
                      {r.evidence_urls && r.evidence_urls.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {r.evidence_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                              Evidence {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                      {r.resolution   && <p className="text-xs text-muted-foreground">Resolution: {r.resolution}</p>}
                      {r.action_taken && <p className="text-xs text-muted-foreground">Action: {r.action_taken}</p>}
                    </div>

                    {(tab === 'pending' || tab === 'reviewing') && (
                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                        {tab === 'pending' && (
                          <form action={async () => {
                            'use server'
                            const ac = createAdminClient()
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            await (ac as any).from('moderation_reports')
                              .update({ status: 'reviewing', reviewed_at: new Date().toISOString() })
                              .eq('id', reportId)
                            revalidatePath('/admin/reports')
                          }}>
                            <Button type="submit" variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                              <Clock className="h-3.5 w-3.5 mr-1.5" />
                              Mark Reviewing
                            </Button>
                          </form>
                        )}

                        <form
                          action={async (fd: FormData) => {
                            'use server'
                            const resolution  = (fd.get('resolution') as string | null)?.trim() || 'Content reviewed'
                            const actionTaken = (fd.get('action_taken') as string | null)?.trim() || null
                            const ac          = createAdminClient()
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            await (ac as any).from('moderation_reports')
                              .update({ status: 'resolved', resolution, action_taken: actionTaken, reviewed_at: new Date().toISOString() })
                              .eq('id', reportId)
                            revalidatePath('/admin/reports')
                          }}
                          className="flex flex-1 flex-wrap gap-2"
                        >
                          <input name="resolution" placeholder="Resolution note"
                            className="flex-1 min-w-[100px] rounded-md border px-3 py-1.5 text-xs bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                          <input name="action_taken" placeholder="Action taken (optional)"
                            className="flex-1 min-w-[100px] rounded-md border px-3 py-1.5 text-xs bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                          <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            Resolve
                          </Button>
                        </form>

                        <form action={async () => {
                          'use server'
                          const ac = createAdminClient()
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          await (ac as any).from('moderation_reports')
                            .update({ status: 'dismissed', reviewed_at: new Date().toISOString() })
                            .eq('id', reportId)
                          revalidatePath('/admin/reports')
                        }}>
                          <Button type="submit" variant="outline" size="sm" className="text-gray-600 border-gray-200 hover:bg-gray-50 shrink-0">
                            <XCircle className="h-3.5 w-3.5 mr-1.5" />
                            Dismiss
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── ANALYTICS TAB ─────────────────────────────────────────────────────── */}
      {view === 'analytics' && (
        <>
          {/* Filters */}
          <form method="GET" className="flex flex-wrap gap-3 items-end rounded-xl border p-4 bg-card">
            <input type="hidden" name="view" value="analytics" />

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">From date</label>
              <input
                type="date"
                name="from"
                defaultValue={fromDate}
                className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">To date</label>
              <input
                type="date"
                name="to"
                defaultValue={toDate}
                className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <select
                name="role"
                defaultValue={roleFilter}
                className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All roles</option>
                {ANALYTICS_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r as UserRole] ?? r}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Subscription</label>
              <select
                name="sub_status"
                defaultValue={subFilter}
                className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All statuses</option>
                {SUB_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
                <option value="__none">No subscription</option>
              </select>
            </div>
            <Button type="submit" size="sm">Apply</Button>
            {/* CSV download — data URL rendered client-side via anchor */}
            <a
              href={csvDataUrl}
              download={`landlordzs-report-${new Date().toISOString().slice(0, 10)}.csv`}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </a>
          </form>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border p-3 text-center">
              <p className="text-2xl font-bold">{analyticsUsers.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total users</p>
            </div>
            <div className="rounded-xl border p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {analyticsUsers.filter((u) => u.subscription_status === 'active').length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Active subs</p>
            </div>
            <div className="rounded-xl border p-3 text-center">
              <p className="text-2xl font-bold text-gray-500">
                {analyticsUsers.filter((u) => !u.subscription_status).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">No subscription</p>
            </div>
            <div className="rounded-xl border p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {analyticsUsers.filter((u) => u.subscription_status === 'expired' || u.subscription_status === 'cancelled').length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Lapsed</p>
            </div>
          </div>

          {/* Table */}
          {analyticsUsers.length === 0 ? (
            <div className="rounded-xl border text-center py-16">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No users match the selected filters</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Account</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Subscription</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Expires</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {analyticsUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium truncate max-w-[160px]">{u.full_name ?? 'Unnamed'}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[160px]">{u.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {ROLE_LABELS[u.role as UserRole] ?? u.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.account_status === 'active'    ? 'bg-emerald-100 text-emerald-700' :
                            u.account_status === 'suspended' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {u.account_status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.subscription_status ? (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              u.subscription_status === 'active'    ? 'bg-emerald-100 text-emerald-700' :
                              u.subscription_status === 'expired'   ? 'bg-red-100 text-red-700' :
                              u.subscription_status === 'cancelled' ? 'bg-gray-100 text-gray-600' :
                              u.subscription_status === 'past_due'  ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {u.subscription_status}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {u.subscription_expires_at
                            ? new Date(u.subscription_expires_at).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelative(u.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
