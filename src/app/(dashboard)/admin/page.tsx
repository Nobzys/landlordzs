import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Users, Building2, TrendingUp, ShieldCheck,
  Wallet, AlertCircle, Scale, Flag,
} from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatRelative } from '@/lib/utils/format'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'
import type { ProfileRow } from '@/types/database'

export const metadata: Metadata = { title: 'Admin Dashboard' }

const ACCOUNT_STATUS_COLOR: Record<string, string> = {
  active:               'bg-green-100 text-green-700',
  suspended:            'bg-red-100 text-red-700',
  banned:               'bg-red-200 text-red-800',
  pending_verification: 'bg-yellow-100 text-yellow-700',
}

export default async function AdminPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { count: totalUsers },
    { count: totalProperties },
    { count: activeListings },
    { count: newUsersToday },
    { count: pendingVerifications },
    { count: pendingPayouts },
    { count: activeEscrows },
    { count: disputedEscrows },
    { count: pendingReports },
    { count: pendingCommissions },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    (supabase as any).from('property_verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    (supabase as any).from('payouts').select('*', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
    (supabase as any).from('escrow_accounts').select('*', { count: 'exact', head: true }).in('status', ['funded', 'disputed']),
    (supabase as any).from('escrow_accounts').select('*', { count: 'exact', head: true }).eq('status', 'disputed'),
    (supabase as any).from('moderation_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    (supabase as any).from('commission_records').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8) as unknown as Promise<{ data: ProfileRow[] | null }>,
  ])

  const pendingVerifCount    = (pendingVerifications as number | null) ?? 0
  const pendingPayoutCount   = (pendingPayouts as number | null) ?? 0
  const activeEscrowCount    = (activeEscrows as number | null) ?? 0
  const disputedEscrowCount  = (disputedEscrows as number | null) ?? 0
  const pendingReportCount   = (pendingReports as number | null) ?? 0
  const pendingCommissionCount = (pendingCommissions as number | null) ?? 0
  const needsAttention = pendingVerifCount + pendingPayoutCount + disputedEscrowCount + pendingReportCount

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawStatuses } = await (supabase as any)
    .from('properties')
    .select('status') as { data: { status: string }[] | null }

  const propertyStats: Record<string, number> = {}
  if (rawStatuses) {
    for (const p of rawStatuses) {
      propertyStats[p.status] = (propertyStats[p.status] ?? 0) + 1
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Platform overview and management</p>
        </div>
      </div>

      {/* Needs Attention banner */}
      {needsAttention > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Action required</p>
            <p className="text-xs text-amber-700 mt-0.5 space-x-1">
              {pendingVerifCount > 0 && <span>{pendingVerifCount} propert{pendingVerifCount === 1 ? 'y' : 'ies'} awaiting verification</span>}
              {pendingVerifCount > 0 && pendingPayoutCount > 0 && <span>·</span>}
              {pendingPayoutCount > 0 && <span>{pendingPayoutCount} payout{pendingPayoutCount === 1 ? '' : 's'} to process</span>}
              {(pendingVerifCount > 0 || pendingPayoutCount > 0) && disputedEscrowCount > 0 && <span>·</span>}
              {disputedEscrowCount > 0 && <span>{disputedEscrowCount} disputed escrow{disputedEscrowCount === 1 ? '' : 's'}</span>}
              {(pendingVerifCount > 0 || pendingPayoutCount > 0 || disputedEscrowCount > 0) && pendingReportCount > 0 && <span>·</span>}
              {pendingReportCount > 0 && <span>{pendingReportCount} unreviewed report{pendingReportCount === 1 ? '' : 's'}</span>}
            </p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            {pendingVerifCount > 0 && (
              <Button asChild size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-100">
                <Link href="/admin/properties">Review</Link>
              </Button>
            )}
            {pendingPayoutCount > 0 && (
              <Button asChild size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-100">
                <Link href="/admin/payouts">Payouts</Link>
              </Button>
            )}
            {disputedEscrowCount > 0 && (
              <Button asChild size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-100">
                <Link href="/admin/escrow">Disputes</Link>
              </Button>
            )}
            {pendingReportCount > 0 && (
              <Button asChild size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-100">
                <Link href="/admin/reports">Reports</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Primary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Total Users</span>
          </div>
          <p className="text-3xl font-bold">{totalUsers ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">+{newUsersToday ?? 0} today</p>
        </div>

        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium">Total Properties</span>
          </div>
          <p className="text-3xl font-bold">{totalProperties ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">{activeListings ?? 0} active</p>
        </div>

        <Link
          href="/admin/properties"
          className={`rounded-xl border p-4 transition-colors ${pendingVerifCount > 0 ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'hover:bg-accent'}`}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium">Pending Approvals</span>
          </div>
          <p className={`text-3xl font-bold ${pendingVerifCount > 0 ? 'text-amber-700' : ''}`}>
            {pendingVerifCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Verifications</p>
        </Link>

        <Link
          href="/admin/payouts"
          className={`rounded-xl border p-4 transition-colors ${pendingPayoutCount > 0 ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'hover:bg-accent'}`}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Wallet className="h-4 w-4" />
            <span className="text-xs font-medium">Pending Payouts</span>
          </div>
          <p className={`text-3xl font-bold ${pendingPayoutCount > 0 ? 'text-amber-700' : ''}`}>
            {pendingPayoutCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
        </Link>
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          href="/admin/escrow"
          className={`rounded-xl border p-4 transition-colors ${disputedEscrowCount > 0 ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'hover:bg-accent'}`}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Scale className="h-4 w-4" />
            <span className="text-xs font-medium">Disputed</span>
          </div>
          <p className={`text-3xl font-bold ${disputedEscrowCount > 0 ? 'text-red-700' : ''}`}>
            {disputedEscrowCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{activeEscrowCount} total active</p>
        </Link>

        <Link
          href="/admin/reports"
          className={`rounded-xl border p-4 transition-colors ${pendingReportCount > 0 ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'hover:bg-accent'}`}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Flag className="h-4 w-4" />
            <span className="text-xs font-medium">Reports</span>
          </div>
          <p className={`text-3xl font-bold ${pendingReportCount > 0 ? 'text-amber-700' : ''}`}>
            {pendingReportCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Pending review</p>
        </Link>

        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">Commissions</span>
          </div>
          <p className="text-3xl font-bold">{pendingCommissionCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending payment</p>
        </div>

        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">New Today</span>
          </div>
          <p className="text-3xl font-bold">{newUsersToday ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">{activeListings ?? 0} live listings</p>
        </div>
      </div>

      {/* Property breakdown */}
      {Object.keys(propertyStats).length > 0 && (
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-sm font-semibold">Properties by Status</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(propertyStats).map(([status, count]) => (
              <div key={status} className="rounded-lg border px-3 py-1.5 text-sm">
                <span className="capitalize text-muted-foreground">{status.replace(/_/g, ' ')}</span>
                <span className="ml-2 font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent users */}
      <div className="rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Recent Users</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/users">View all →</Link>
          </Button>
        </div>
        {recentUsers && recentUsers.length > 0 ? (
          <div className="divide-y">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  {(u.full_name ?? u.email ?? '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {u.full_name ?? u.display_name ?? 'Unnamed user'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {ROLE_LABELS[u.role as UserRole] ?? u.role}
                  </Badge>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ACCOUNT_STATUS_COLOR[u.account_status] ?? 'bg-gray-100 text-gray-700'}`}
                  >
                    {u.account_status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                  {formatRelative(u.created_at)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No users yet.</p>
        )}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border p-4">
        <h2 className="text-sm font-semibold mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/users">Manage Users</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/properties">
              Review Properties
              {pendingVerifCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {pendingVerifCount > 9 ? '9+' : pendingVerifCount}
                </span>
              )}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/payouts">
              Process Payouts
              {pendingPayoutCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {pendingPayoutCount > 9 ? '9+' : pendingPayoutCount}
                </span>
              )}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/escrow">
              Escrow Disputes
              {disputedEscrowCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {disputedEscrowCount > 9 ? '9+' : disputedEscrowCount}
                </span>
              )}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/reports">
              Reports
              {pendingReportCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {pendingReportCount > 9 ? '9+' : pendingReportCount}
                </span>
              )}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/commissions">Commissions</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/settings">Settings</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/properties">Browse Marketplace</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
