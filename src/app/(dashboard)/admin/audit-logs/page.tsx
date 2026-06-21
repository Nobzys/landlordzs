import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ClipboardList, Shield, Activity, ShieldCheck, Eye } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { formatRelative } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Audit Logs — Admin' }

type AdminLogRow = {
  id: string
  actor_id: string
  action: string
  target_type: string | null
  target_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
  actor: { full_name: string | null; display_name: string | null; email: string | null } | null
}

type ActivityLogRow = {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  user: { full_name: string | null; display_name: string | null; email: string | null } | null
}

type VerificationAuditRow = {
  id: string
  verification_id: string
  previous_status: string | null
  new_status: string
  action: string
  notes: string | null
  created_at: string
  admin: { full_name: string | null; display_name: string | null; email: string | null } | null
}

type PreviewSessionRow = {
  id: string
  target_user_id: string
  started_at: string
  ended_at: string | null
  ip_address: string | null
  admin: { full_name: string | null; display_name: string | null; email: string | null } | null
  target: { full_name: string | null; display_name: string | null; email: string | null } | null
}

const PAGE_SIZE = 50

const ACTION_COLOR: Record<string, string> = {
  approve_professional: 'bg-green-100 text-green-700',
  reject_professional:  'bg-red-100 text-red-700',
  assign_role:          'bg-blue-100 text-blue-700',
  suspend_account:      'bg-red-100 text-red-700',
  activate_account:     'bg-green-100 text-green-700',
}

function actorLabel(actor: { full_name: string | null; display_name: string | null; email: string | null } | null) {
  if (!actor) return 'Unknown'
  return actor.full_name?.trim() || actor.display_name?.trim() || actor.email?.trim() || 'Unknown'
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const params = await searchParams
  const tab = ['activity', 'verifications', 'previews'].includes(params.tab ?? '')
    ? (params.tab as 'activity' | 'verifications' | 'previews')
    : 'admin'

  const supabase = await createClient()

  const [{ data: adminLogs }, { data: activityLogs }, { data: verificationLogs }, { data: previewSessions }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('admin_logs')
      .select('*, actor:profiles!admin_logs_actor_id_fkey(full_name, display_name, email)')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE) as Promise<{ data: AdminLogRow[] | null }>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('activity_logs')
      .select('*, user:profiles!activity_logs_user_id_fkey(full_name, display_name, email)')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE) as Promise<{ data: ActivityLogRow[] | null }>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('verification_audit_logs')
      .select('id, verification_id, previous_status, new_status, action, notes, created_at, admin:profiles!verification_audit_logs_admin_id_fkey(full_name, display_name, email)')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE) as Promise<{ data: VerificationAuditRow[] | null }>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('admin_impersonation_logs')
      .select('id, target_user_id, started_at, ended_at, ip_address, admin:profiles!admin_impersonation_logs_admin_id_fkey(full_name, display_name, email), target:profiles!admin_impersonation_logs_target_user_id_fkey(full_name, display_name, email)')
      .order('started_at', { ascending: false })
      .limit(PAGE_SIZE) as Promise<{ data: PreviewSessionRow[] | null }>,
  ])

  const rows = tab === 'admin' ? (adminLogs ?? []) : []
  const activityRows = tab === 'activity' ? (activityLogs ?? []) : []
  const verificationRows = tab === 'verifications' ? (verificationLogs ?? []) : []
  const previewRows = tab === 'previews' ? (previewSessions ?? []) : []

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <LinkButton href="/admin" variant="ghost" size="icon" className="-ml-2">
          <ChevronLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Audit Logs</h1>
            <p className="text-sm text-muted-foreground">Admin actions and platform activity</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href="/admin/audit-logs?tab=admin"
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
            tab === 'admin' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
          }`}
        >
          <Shield className="h-3.5 w-3.5" /> Admin Actions
        </Link>
        <Link
          href="/admin/audit-logs?tab=activity"
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
            tab === 'activity' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
          }`}
        >
          <Activity className="h-3.5 w-3.5" /> User Activity
        </Link>
        <Link
          href="/admin/audit-logs?tab=verifications"
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
            tab === 'verifications' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Verifications
        </Link>
        <Link
          href="/admin/audit-logs?tab=previews"
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
            tab === 'previews' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
          }`}
        >
          <Eye className="h-3.5 w-3.5" /> Preview Sessions
        </Link>
      </div>

      {tab === 'admin' ? (
        <div className="rounded-xl border overflow-hidden">
          {rows.length > 0 ? (
            <div className="divide-y">
              {rows.map((row) => (
                <div key={row.id} className="flex items-start gap-3 px-4 py-3">
                  <Badge variant="secondary" className={`text-xs capitalize shrink-0 ${ACTION_COLOR[row.action] ?? ''}`}>
                    {row.action.replace(/_/g, ' ')}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{actorLabel(row.actor)}</span>
                      {row.target_type && (
                        <span className="text-muted-foreground"> · {row.target_type} {row.target_id?.slice(0, 8)}</span>
                      )}
                    </p>
                    {(row.old_data || row.new_data) && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {row.old_data && <span>from {JSON.stringify(row.old_data)} </span>}
                        {row.new_data && <span>to {JSON.stringify(row.new_data)}</span>}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">{formatRelative(row.created_at)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No admin actions logged yet.</p>
          )}
        </div>
      ) : tab === 'activity' ? (
        <div className="rounded-xl border overflow-hidden">
          {activityRows.length > 0 ? (
            <div className="divide-y">
              {activityRows.map((row) => (
                <div key={row.id} className="flex items-start gap-3 px-4 py-3">
                  <Badge variant="outline" className="text-xs capitalize shrink-0">
                    {row.action.replace(/_/g, ' ')}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{actorLabel(row.user)}</span>
                      {row.entity_type && (
                        <span className="text-muted-foreground"> · {row.entity_type} {row.entity_id?.slice(0, 8)}</span>
                      )}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">{formatRelative(row.created_at)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No activity logged yet.</p>
          )}
        </div>
      ) : tab === 'verifications' ? (
        <div className="rounded-xl border overflow-hidden">
          {verificationRows.length > 0 ? (
            <div className="divide-y">
              {verificationRows.map((row) => (
                <div key={row.id} className="flex items-start gap-3 px-4 py-3">
                  <Badge variant="secondary" className={`text-xs capitalize shrink-0 ${ACTION_COLOR[row.action] ?? ''}`}>
                    {row.action.replace(/_/g, ' ')}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{actorLabel(row.admin)}</span>
                      {row.previous_status && row.previous_status !== row.new_status && (
                        <span className="text-muted-foreground"> · {row.previous_status} → {row.new_status}</span>
                      )}
                    </p>
                    {row.notes && <p className="text-xs text-muted-foreground truncate mt-0.5">{row.notes}</p>}
                    <Link href={`/admin/verifications/${row.verification_id}`} className="text-xs text-primary hover:underline">View request</Link>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">{formatRelative(row.created_at)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No verification actions logged yet.</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          {previewRows.length > 0 ? (
            <div className="divide-y">
              {previewRows.map((row) => (
                <div key={row.id} className="flex items-start gap-3 px-4 py-3">
                  <Badge variant="outline" className="text-xs shrink-0">
                    {row.ended_at ? 'Ended' : 'In progress'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{actorLabel(row.admin)}</span>
                      <span className="text-muted-foreground"> previewed </span>
                      <Link href={`/admin/users/${row.target_user_id}`} className="font-medium hover:underline">{actorLabel(row.target)}</Link>
                    </p>
                    {row.ip_address && <p className="text-xs text-muted-foreground mt-0.5">IP: {row.ip_address}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Started {formatRelative(row.started_at)}</p>
                    {row.ended_at && <p className="text-xs text-muted-foreground">Ended {formatRelative(row.ended_at)}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No preview sessions logged yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
