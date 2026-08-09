import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, ClipboardList, ShieldCheck, ChevronRight,
} from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS } from '@/types/auth'
import { formatRelative, getInitial } from '@/lib/utils/format'
import type { UserRole } from '@/types/auth'

export const metadata: Metadata = { title: 'Verifications — Admin' }

const PROFESSIONAL_ROLES = [
  'seller', 'vendor', 'agent', 'contractor', 'engineer', 'architect', 'lawyer',
] as const

const STATUS_TABS = ['pending', 'approved', 'rejected', 'all'] as const
type VerifTab = (typeof STATUS_TABS)[number]

const KYC_COLOR: Record<string, string> = {
  pending:         'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  approved:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected:        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  needs_more_info: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  expired:         'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

type KycEmbed = {
  id: string
  status: string
  submitted_at: string | null
  reviewed_at:  string | null
}

type ProfileWithKyc = {
  id:             string
  full_name:      string | null
  display_name:   string | null
  email:          string
  role:           string
  city:           string | null
  account_status: string
  created_at:     string
  kyc_records:    KycEmbed[]
}

interface SearchParams { tab?: string }

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const [callerProfile, params] = await Promise.all([getServerProfile(), searchParams])
  if (!callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'moderator')) {
    redirect('/login')
  }

  const tab: VerifTab = STATUS_TABS.includes(params.tab as VerifTab)
    ? (params.tab as VerifTab)
    : 'pending'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: raw } = (await admin
    .from('profiles')
    .select(`
      id, full_name, display_name, email, role, city, account_status, created_at,
      kyc_records ( id, status, submitted_at, reviewed_at )
    `)
    .in('role', PROFESSIONAL_ROLES)
    .eq('onboarding_completed', true)
    .order('created_at', { ascending: false })
    .limit(200)) as { data: ProfileWithKyc[] | null }

  const profiles = (raw ?? []).map((p) => ({
    ...p,
    kyc_records: Array.isArray(p.kyc_records)
      ? [...p.kyc_records].sort((a, b) =>
          (b.submitted_at ?? '').localeCompare(a.submitted_at ?? ''))
      : [],
  }))

  const withKyc = profiles.filter((p) => p.kyc_records.length > 0)

  const filtered = withKyc.filter((p) => {
    const latest = p.kyc_records[0].status
    if (tab === 'pending')  return latest === 'pending' || latest === 'needs_more_info'
    if (tab === 'approved') return latest === 'approved'
    if (tab === 'rejected') return latest === 'rejected'
    return true
  })

  const counts: Record<VerifTab, number> = {
    pending:  withKyc.filter(p => { const s = p.kyc_records[0].status; return s === 'pending' || s === 'needs_more_info' }).length,
    approved: withKyc.filter(p => p.kyc_records[0].status === 'approved').length,
    rejected: withKyc.filter(p => p.kyc_records[0].status === 'rejected').length,
    all:      withKyc.length,
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/admin"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Verifications</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} {tab === 'all' ? '' : tab}{' '}
              record{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={`/admin/verifications?tab=${s}`}
            className={`relative rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
              tab === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent'
            }`}
          >
            {s === 'pending' ? 'Pending Review'
              : s === 'approved' ? 'Approved'
              : s === 'rejected' ? 'Rejected'
              : 'All'}
            {counts[s] > 0 && (
              <span className={`ml-1.5 inline-flex h-4 min-w-[1rem] px-1 items-center
                justify-center rounded-full text-[10px] font-bold ${
                  s === 'pending'
                    ? 'bg-amber-500 text-white'
                    : 'bg-muted-foreground/20 text-foreground'
                }`}
              >
                {counts[s]}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">
            No {tab === 'all' ? '' : tab + ' '}verification records found.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="divide-y">
            {filtered.map((p) => {
              const kyc         = p.kyc_records[0]
              const displayName = p.full_name?.trim() || p.display_name?.trim() || p.email
              return (
                <Link
                  key={p.id}
                  href={`/admin/verifications/${kyc.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center
                    rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {getInitial(p.full_name, p.display_name, p.email)}
                  </div>

                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                  </div>

                  {/* Role */}
                  <Badge variant="secondary" className="text-xs shrink-0 hidden sm:flex">
                    {ROLE_LABELS[p.role as UserRole] ?? p.role}
                  </Badge>

                  {/* City */}
                  {p.city && (
                    <span className="text-xs text-muted-foreground shrink-0 hidden md:block">
                      {p.city}
                    </span>
                  )}

                  {/* KYC status */}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    KYC_COLOR[kyc.status] ?? 'bg-gray-100 text-gray-600'
                  }`}>
                    {kyc.status.replace(/_/g, ' ')}
                  </span>

                  {/* Submitted */}
                  {kyc.submitted_at && (
                    <span className="text-xs text-muted-foreground shrink-0 hidden lg:block
                      w-20 text-right">
                      {formatRelative(kyc.submitted_at)}
                    </span>
                  )}

                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
