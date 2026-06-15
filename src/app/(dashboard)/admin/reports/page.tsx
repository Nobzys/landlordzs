import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { Flag, ChevronLeft, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatRelative } from '@/lib/utils/format'
import { canAccessAdmin } from '@/lib/roles'

export const metadata: Metadata = { title: 'Moderation Reports — Admin' }

const STATUS_TABS = ['pending', 'reviewing', 'resolved', 'dismissed'] as const
type ReportStatus = (typeof STATUS_TABS)[number]

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
  id:            string
  target_type:   string
  target_id:     string
  report_type:   string
  reason:        string
  evidence_urls: string[]
  status:        string
  resolution:    string | null
  action_taken:  string | null
  reported_at:   string
  reviewed_at:   string | null
  reporter:      ReporterProfile | ReporterProfile[] | null
}

type ReportRowNormalized = Omit<ReportRow, 'reporter'> & {
  reporter: ReporterProfile | null
}

interface SearchParams { tab?: string }

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile || !canAccessAdmin(profile.role)) redirect('/login')

  const params = await searchParams
  const tab: ReportStatus =
    STATUS_TABS.includes(params.tab as ReportStatus)
      ? (params.tab as ReportStatus)
      : 'pending'

  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (adminClient as any)
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

  const reports: ReportRowNormalized[] = (raw ?? []).map((r) => ({
    ...r,
    reporter: Array.isArray(r.reporter) ? (r.reporter[0] ?? null) : r.reporter,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: pendingCount } = await (adminClient as any)
    .from('moderation_reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/admin"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
            <Flag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Moderation Reports</h1>
            <p className="text-sm text-muted-foreground">
              {reports.length} {tab} report{reports.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={`/admin/reports?tab=${s}`}
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

      {/* List */}
      {reports.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-60" />
          <p className="text-sm font-medium text-muted-foreground capitalize">No {tab} reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const reportId    = r.id
            const reporterName = r.reporter?.full_name ?? r.reporter?.email ?? 'Unknown'

            return (
              <div key={r.id} className="rounded-xl border bg-card p-4 space-y-3">
                {/* Info */}
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
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Evidence {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  {r.resolution && (
                    <p className="text-xs text-muted-foreground">Resolution: {r.resolution}</p>
                  )}
                  {r.action_taken && (
                    <p className="text-xs text-muted-foreground">Action taken: {r.action_taken}</p>
                  )}
                </div>

                {/* Actions */}
                {(tab === 'pending' || tab === 'reviewing') && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                    {tab === 'pending' && (
                      <form action={async () => {
                        'use server'
                        const adminCl = createAdminClient()
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        await (adminCl as any)
                          .from('moderation_reports')
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
                        const adminCl     = createAdminClient()
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        await (adminCl as any)
                          .from('moderation_reports')
                          .update({
                            status:       'resolved',
                            resolution,
                            action_taken: actionTaken,
                            reviewed_at:  new Date().toISOString(),
                          })
                          .eq('id', reportId)
                        revalidatePath('/admin/reports')
                      }}
                      className="flex flex-1 flex-wrap gap-2"
                    >
                      <input
                        name="resolution"
                        placeholder="Resolution note"
                        className="flex-1 min-w-[100px] rounded-md border px-3 py-1.5 text-xs bg-background
                          placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        name="action_taken"
                        placeholder="Action taken (optional)"
                        className="flex-1 min-w-[100px] rounded-md border px-3 py-1.5 text-xs bg-background
                          placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Resolve
                      </Button>
                    </form>

                    <form action={async () => {
                      'use server'
                      const adminCl = createAdminClient()
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      await (adminCl as any)
                        .from('moderation_reports')
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
    </div>
  )
}
