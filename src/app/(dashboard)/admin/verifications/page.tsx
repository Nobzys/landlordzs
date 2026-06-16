import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, ChevronLeft, CheckCircle2, Eye } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerProfile } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { formatRelative } from '@/lib/utils/format'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'
import { canAccessAdmin } from '@/lib/roles'

export const metadata: Metadata = { title: 'Verification Requests — Admin' }

const TABS = ['under_review', 'approved', 'rejected'] as const
type TabKey = (typeof TABS)[number]

const TAB_LABEL: Record<TabKey, string> = {
  under_review: 'Under Review',
  approved:     'Approved',
  rejected:     'Rejected',
}

const TAB_BADGE_COLOR: Record<TabKey, string> = {
  under_review: 'bg-amber-500 text-white',
  approved:     'bg-emerald-500 text-white',
  rejected:     'bg-red-500 text-white',
}

const STATUS_PILL: Record<TabKey, string> = {
  under_review: 'bg-blue-100 text-blue-700',
  approved:     'bg-emerald-100 text-emerald-700',
  rejected:     'bg-red-100 text-red-700',
}

const VERIF_TYPE_LABEL: Record<string, string> = {
  identity: 'Identity',
  email:    'Email',
  phone:    'Phone',
  business: 'Business',
  license:  'License',
  address:  'Address',
}

type VerifRow = {
  id:                string
  verification_type: string
  status:            string
  submitted_at:      string | null
  notes:             string | null
  profiles: {
    id:           string
    full_name:    string | null
    display_name: string | null
    email:        string
    role:         string
  } | null
}

interface SearchParams { tab?: string }

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile || !canAccessAdmin(profile.role)) redirect('/login')

  const params = await searchParams
  const tab: TabKey =
    TABS.includes(params.tab as TabKey) ? (params.tab as TabKey) : 'under_review'

  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (adminClient as any)
    .from('verification_requests')
    .select('id, verification_type, status, submitted_at, notes, profiles!user_id ( id, full_name, display_name, email, role )')
    .eq('status', tab)
    .order('submitted_at', { ascending: tab === 'under_review' })
    .limit(100) as { data: VerifRow[] | null }

  const rows: VerifRow[] = (raw ?? []).map((r) => ({
    ...r,
    profiles: Array.isArray(r.profiles) ? ((r.profiles as unknown as VerifRow['profiles'][])[0] ?? null) : r.profiles,
  }))

  const [{ count: underReviewCount }, { count: approvedCount }, { count: rejectedCount }] =
    await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (adminClient as any)
        .from('verification_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'under_review'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (adminClient as any)
        .from('verification_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (adminClient as any)
        .from('verification_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected'),
    ])

  const COUNTS: Record<TabKey, number> = {
    under_review: (underReviewCount as number) ?? 0,
    approved:     (approvedCount   as number) ?? 0,
    rejected:     (rejectedCount   as number) ?? 0,
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/admin"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Verification Requests</h1>
            <p className="text-sm text-muted-foreground">
              {rows.length} {TAB_LABEL[tab].toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/verifications?tab=${t}`}
            className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
              tab === t
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent'
            }`}
          >
            {TAB_LABEL[t]}
            {COUNTS[t] > 0 && (
              <span className={`inline-flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full text-[10px] font-bold ${TAB_BADGE_COLOR[t]}`}>
                {COUNTS[t] > 99 ? '99+' : COUNTS[t]}
              </span>
            )}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            No {TAB_LABEL[tab].toLowerCase()} requests
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const prof        = row.profiles
            const displayName = prof?.full_name ?? prof?.display_name ?? prof?.email ?? '—'
            const typLabel    = VERIF_TYPE_LABEL[row.verification_type] ?? row.verification_type

            return (
              <div key={row.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{displayName}</p>
                      {prof?.role && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {ROLE_LABELS[prof.role as UserRole] ?? prof.role}
                        </Badge>
                      )}
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_PILL[tab]}`}>
                        {typLabel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{prof?.email}</p>
                    {row.submitted_at && (
                      <p className="text-xs text-muted-foreground">
                        Submitted {formatRelative(row.submitted_at)}
                      </p>
                    )}
                  </div>

                  <LinkButton
                    href={`/admin/verifications/${row.id}`}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    Review
                  </LinkButton>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
