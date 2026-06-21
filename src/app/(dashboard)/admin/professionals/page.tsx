import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import {
  Briefcase, ChevronLeft, CheckCircle2,
  AlertCircle, ShieldCheck,
} from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { formatRelative } from '@/lib/utils/format'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'

export const metadata: Metadata = { title: 'Professional Accounts — Admin' }

// Verification (KYC approve/reject/request-info) lives exclusively at
// /admin/verifications — it applies platform-wide, not just to professional
// roles, so it isn't duplicated here. This page is account-status moderation
// (active/suspended/banned) for professional-role accounts only.

const STATUS_TABS = ['pending', 'active', 'suspended'] as const
type AccountStatus = (typeof STATUS_TABS)[number]

const ACCOUNT_COLOR: Record<string, string> = {
  pending_verification: 'bg-amber-100 text-amber-700',
  active:               'bg-emerald-100 text-emerald-700',
  suspended:            'bg-red-100 text-red-700',
  banned:               'bg-red-200 text-red-800',
}

const KYC_COLOR: Record<string, string> = {
  pending:  'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

type KycRow = {
  id:                string
  status:            string
  review_notes:      string | null
  national_id_front: string | null
  national_id_back:  string | null
  business_reg:      string | null
  submitted_at:      string | null
}

type ProfessionalRow = {
  id:             string
  full_name:      string | null
  display_name:   string | null
  email:          string
  avatar_url:     string | null
  role:           string
  account_status: string
  created_at:     string
  kyc_records:    KycRow[]
  professional_profiles: { profession_type: string; company_name: string | null; is_verified: boolean } | null
  agent_profiles:        { license_verified: boolean } | null
}

interface SearchParams { tab?: string }

export default async function AdminProfessionalsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const params = await searchParams
  const tab: AccountStatus =
    STATUS_TABS.includes(params.tab as AccountStatus)
      ? (params.tab as AccountStatus)
      : 'pending'

  const adminClient = createAdminClient()

  // Map tab → account_status filter
  const statusFilter =
    tab === 'pending'   ? 'pending_verification' :
    tab === 'active'    ? 'active' :
    'suspended'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (adminClient as any)
    .from('profiles')
    .select(`
      id, full_name, display_name, email, avatar_url, role, account_status, created_at,
      kyc_records ( id, status, review_notes, national_id_front, national_id_back, business_reg, submitted_at ),
      professional_profiles ( profession_type, company_name, is_verified ),
      agent_profiles ( license_verified )
    `)
    .in('role', ['seller', 'vendor', 'agent', 'contractor', 'engineer', 'architect', 'lawyer'])
    .eq('account_status', statusFilter)
    .eq('onboarding_completed', true)
    .order('created_at', { ascending: tab === 'pending' })
    .limit(100) as { data: ProfessionalRow[] | null }

  const professionals: ProfessionalRow[] = (raw ?? []).map((p) => ({
    ...p,
    // Supabase returns array for one-to-many; sort by submitted_at desc, take latest
    kyc_records: Array.isArray(p.kyc_records)
      ? [...p.kyc_records].sort((a, b) =>
          (b.submitted_at ?? '').localeCompare(a.submitted_at ?? ''))
      : [],
    professional_profiles: Array.isArray(p.professional_profiles)
      ? (p.professional_profiles[0] ?? null)
      : p.professional_profiles,
    agent_profiles: Array.isArray(p.agent_profiles)
      ? (p.agent_profiles[0] ?? null)
      : p.agent_profiles,
  }))

  // Counts for tab badges
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: pendingCount } = await (adminClient as any)
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .in('role', ['seller', 'vendor', 'agent', 'contractor', 'engineer', 'architect', 'lawyer'])
    .eq('account_status', 'pending_verification')
    .eq('onboarding_completed', true)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LinkButton href="/admin" variant="ghost" size="icon" className="-ml-2">
          <ChevronLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Professional Accounts</h1>
            <p className="text-sm text-muted-foreground">
              {professionals.length} {tab} professional{professionals.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Identity-document review now lives in the platform-wide Verification Center */}
      <Link
        href="/admin/verifications"
        className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 hover:bg-blue-100 transition-colors"
      >
        <ShieldCheck className="h-5 w-5 text-blue-700 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">Reviewing identity verification documents?</p>
          <p className="text-xs text-blue-700">Approve, reject, or request more info from the dedicated Verification Center →</p>
        </div>
      </Link>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={`/admin/professionals?tab=${s}`}
            className={`relative rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors capitalize ${
              tab === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent'
            }`}
          >
            {s === 'pending' ? 'Pending Verification' : s === 'active' ? 'Approved' : 'Suspended'}
            {s === 'pending' && (pendingCount ?? 0) > 0 && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {(pendingCount as number) > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* List */}
      {professionals.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-60" />
          <p className="text-sm font-medium text-muted-foreground capitalize">
            No {tab === 'pending' ? 'pending verifications' : tab === 'active' ? 'approved professionals' : 'suspended accounts'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {professionals.map((p) => {
            const latestKyc    = p.kyc_records[0] ?? null
            const displayName  = p.full_name?.trim() || p.display_name?.trim() || p.email?.trim() || 'Unnamed user'
            const userId       = p.id

            return (
              <div key={p.id} className="rounded-xl border bg-card p-4 space-y-3">
                {/* Info row */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Avatar src={p.avatar_url} name={displayName} />
                    <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{displayName}</p>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {ROLE_LABELS[p.role as UserRole] ?? p.role}
                      </Badge>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ACCOUNT_COLOR[p.account_status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {p.account_status?.replace(/_/g, ' ') ?? 'unknown'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.email?.trim() || 'No email'}</p>
                    {p.professional_profiles?.company_name && (
                      <p className="text-xs text-muted-foreground">{p.professional_profiles.company_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Joined {formatRelative(p.created_at)}
                    </p>
                    </div>
                  </div>

                  {/* KYC status */}
                  <div className="shrink-0 text-right space-y-1">
                    {latestKyc ? (
                      <>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${KYC_COLOR[latestKyc.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          KYC: {latestKyc.status}
                        </span>
                        {latestKyc.submitted_at && (
                          <p className="text-xs text-muted-foreground">
                            Submitted {formatRelative(latestKyc.submitted_at)}
                          </p>
                        )}
                        <Link href={`/admin/verifications/${latestKyc.id}`} className="block text-xs text-primary hover:underline">
                          View full request
                        </Link>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <AlertCircle className="h-3.5 w-3.5" />
                        No documents
                      </span>
                    )}
                    <Link href={`/admin/users/${p.id}`} className="block text-xs text-muted-foreground hover:underline">
                      View profile
                    </Link>
                  </div>
                </div>

                {latestKyc?.review_notes && tab === 'pending' && (
                  <p className="text-xs text-muted-foreground pt-1">Latest review note: {latestKyc.review_notes}</p>
                )}

                {/* Account-status actions only — KYC approve/reject happens in the Verification Center */}
                {tab === 'active' && (
                  <div className="flex gap-2 pt-2 border-t">
                    {/* Suspend */}
                    <form action={async (fd: FormData) => {
                      'use server'
                      const reason = (fd.get('reason') as string | null)?.trim() || 'Account suspended by admin.'
                      const adminCl = createAdminClient()
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      await (adminCl as any)
                        .from('profiles')
                        .update({ account_status: 'suspended' })
                        .eq('id', userId)
                      revalidatePath('/admin/professionals')
                    }} className="flex flex-1 gap-2">
                      <input
                        name="reason"
                        placeholder="Suspension reason (optional)"
                        className="flex-1 min-w-0 rounded-md border px-3 py-1.5 text-xs bg-background
                          placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                      >
                        Suspend
                      </Button>
                    </form>
                  </div>
                )}

                {tab === 'suspended' && (
                  <div className="flex gap-2 pt-2 border-t">
                    {/* Reactivate */}
                    <form action={async () => {
                      'use server'
                      const adminCl = createAdminClient()
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      await (adminCl as any)
                        .from('profiles')
                        .update({ account_status: 'active' })
                        .eq('id', userId)
                      revalidatePath('/admin/professionals')
                    }}>
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Reactivate
                      </Button>
                    </form>

                    {/* Permanent ban */}
                    <form action={async () => {
                      'use server'
                      const adminCl = createAdminClient()
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      await (adminCl as any)
                        .from('profiles')
                        .update({ account_status: 'banned' })
                        .eq('id', userId)
                      revalidatePath('/admin/professionals')
                    }}>
                      <Button type="submit" variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                        Ban
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
