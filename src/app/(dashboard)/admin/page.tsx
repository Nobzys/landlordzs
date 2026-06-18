import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Users, Building2, TrendingUp, ShieldCheck,
  Wallet, AlertCircle, Scale, Flag,
  UserPlus, CheckCircle2, XCircle, ClipboardList,
} from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatRelative, getInitial } from '@/lib/utils/format'
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

const STATUS_BADGE_COLOR: Record<string, string> = {
  draft:          'bg-gray-100 text-gray-600',
  pending_review: 'bg-amber-100 text-amber-700',
  active:         'bg-green-100 text-green-700',
  under_offer:    'bg-blue-100 text-blue-700',
  sold:           'bg-purple-100 text-purple-700',
  rented:         'bg-teal-100 text-teal-700',
  off_market:     'bg-gray-100 text-gray-600',
  expired:        'bg-orange-100 text-orange-700',
  rejected:       'bg-red-100 text-red-700',
}

type AdminMetrics = {
  users_by_role: Record<string, number>
  new_users_today: number
  props_by_status: Record<string, number>
  verif_pending: number
  verif_approved_today: number
  verif_rejected_today: number
  total_verified_props: number
  pending_payouts: number
  active_escrows: number
  disputed_escrows: number
  pending_reports: number
  pending_commissions: number
}

type ActivityRow = {
  action: string
  entity_type: string
  entity_id: string
  label: string | null
  actor_name: string | null
  occurred_at: string
}

const ACTIVITY_CONFIG: Record<string, { label: string; Icon: typeof UserPlus; color: string }> = {
  user_registered:    { label: 'New user joined',      Icon: UserPlus,      color: 'text-blue-500' },
  property_submitted: { label: 'Property submitted',   Icon: Building2,     color: 'text-amber-500' },
  property_approved:  { label: 'Property approved',    Icon: CheckCircle2,  color: 'text-green-500' },
  property_rejected:  { label: 'Property rejected',    Icon: XCircle,       color: 'text-red-500' },
  account_suspended:  { label: 'Account suspended',    Icon: AlertCircle,   color: 'text-red-600' },
}

export default async function AdminPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const supabase = await createClient()

  const [
    { data: rawMetrics },
    { data: recentUsers },
    { data: activityRows },
  ] = await Promise.all([
    // Single RPC replaces 11 individual COUNT queries + N+1 status scan
    (supabase as any).rpc('get_admin_metrics') as Promise<{ data: AdminMetrics | null }>,
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8) as unknown as Promise<{ data: ProfileRow[] | null }>,
    (supabase as any).rpc('get_admin_activity', { p_limit: 15 }) as Promise<{ data: ActivityRow[] | null }>,
  ])

  const m: AdminMetrics = rawMetrics ?? {
    users_by_role: {}, new_users_today: 0,
    props_by_status: {},
    verif_pending: 0, verif_approved_today: 0, verif_rejected_today: 0, total_verified_props: 0,
    pending_payouts: 0, active_escrows: 0, disputed_escrows: 0,
    pending_reports: 0, pending_commissions: 0,
  }

  const totalUsers       = Object.values(m.users_by_role).reduce((s, n) => s + n, 0)
  const totalProperties  = Object.values(m.props_by_status).reduce((s, n) => s + n, 0)
  const activeListings   = m.props_by_status['active'] ?? 0
  const needsAttention   = m.verif_pending + m.pending_payouts + m.disputed_escrows + m.pending_reports

  // All 9 roles in display order
  const ROLE_ORDER: UserRole[] = ['buyer', 'seller', 'agent', 'vendor', 'contractor', 'engineer', 'architect', 'lawyer', 'admin']

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
              {m.verif_pending > 0 && <span>{m.verif_pending} propert{m.verif_pending === 1 ? 'y' : 'ies'} awaiting verification</span>}
              {m.verif_pending > 0 && m.pending_payouts > 0 && <span>·</span>}
              {m.pending_payouts > 0 && <span>{m.pending_payouts} payout{m.pending_payouts === 1 ? '' : 's'} to process</span>}
              {(m.verif_pending > 0 || m.pending_payouts > 0) && m.disputed_escrows > 0 && <span>·</span>}
              {m.disputed_escrows > 0 && <span>{m.disputed_escrows} disputed escrow{m.disputed_escrows === 1 ? '' : 's'}</span>}
              {(m.verif_pending > 0 || m.pending_payouts > 0 || m.disputed_escrows > 0) && m.pending_reports > 0 && <span>·</span>}
              {m.pending_reports > 0 && <span>{m.pending_reports} unreviewed report{m.pending_reports === 1 ? '' : 's'}</span>}
            </p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            {m.verif_pending > 0 && (
              <Button asChild size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-100">
                <Link href="/admin/properties">Review</Link>
              </Button>
            )}
            {m.pending_payouts > 0 && (
              <Button asChild size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-100">
                <Link href="/admin/payouts">Payouts</Link>
              </Button>
            )}
            {m.disputed_escrows > 0 && (
              <Button asChild size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-100">
                <Link href="/admin/escrow">Disputes</Link>
              </Button>
            )}
            {m.pending_reports > 0 && (
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
          <p className="text-3xl font-bold">{totalUsers}</p>
          <p className="text-xs text-muted-foreground mt-1">+{m.new_users_today} today</p>
        </div>

        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium">Total Properties</span>
          </div>
          <p className="text-3xl font-bold">{totalProperties}</p>
          <p className="text-xs text-muted-foreground mt-1">{activeListings} active</p>
        </div>

        <Link
          href="/admin/properties"
          className={`rounded-xl border p-4 transition-colors ${m.verif_pending > 0 ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'hover:bg-accent'}`}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium">Pending Approvals</span>
          </div>
          <p className={`text-3xl font-bold ${m.verif_pending > 0 ? 'text-amber-700' : ''}`}>
            {m.verif_pending}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Verifications</p>
        </Link>

        <Link
          href="/admin/payouts"
          className={`rounded-xl border p-4 transition-colors ${m.pending_payouts > 0 ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'hover:bg-accent'}`}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Wallet className="h-4 w-4" />
            <span className="text-xs font-medium">Pending Payouts</span>
          </div>
          <p className={`text-3xl font-bold ${m.pending_payouts > 0 ? 'text-amber-700' : ''}`}>
            {m.pending_payouts}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
        </Link>
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          href="/admin/escrow"
          className={`rounded-xl border p-4 transition-colors ${m.disputed_escrows > 0 ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'hover:bg-accent'}`}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Scale className="h-4 w-4" />
            <span className="text-xs font-medium">Disputed</span>
          </div>
          <p className={`text-3xl font-bold ${m.disputed_escrows > 0 ? 'text-red-700' : ''}`}>
            {m.disputed_escrows}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{m.active_escrows} total active</p>
        </Link>

        <Link
          href="/admin/reports"
          className={`rounded-xl border p-4 transition-colors ${m.pending_reports > 0 ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'hover:bg-accent'}`}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Flag className="h-4 w-4" />
            <span className="text-xs font-medium">Reports</span>
          </div>
          <p className={`text-3xl font-bold ${m.pending_reports > 0 ? 'text-amber-700' : ''}`}>
            {m.pending_reports}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Pending review</p>
        </Link>

        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">Commissions</span>
          </div>
          <p className="text-3xl font-bold">{m.pending_commissions}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending payment</p>
        </div>

        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">New Today</span>
          </div>
          <p className="text-3xl font-bold">{m.new_users_today}</p>
          <p className="text-xs text-muted-foreground mt-1">{activeListings} live listings</p>
        </div>
      </div>

      {/* Users by role */}
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Users by Role</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {ROLE_ORDER.map((role) => {
            const count = m.users_by_role[role] ?? 0
            return (
              <div key={role} className="rounded-lg border px-3 py-2 text-center">
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs text-muted-foreground truncate">{ROLE_LABELS[role]}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Verification metrics */}
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Verification Overview</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href="/admin/properties"
            className={`rounded-lg border p-3 transition-colors ${m.verif_pending > 0 ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'hover:bg-accent'}`}
          >
            <p className={`text-2xl font-bold ${m.verif_pending > 0 ? 'text-amber-700' : ''}`}>{m.verif_pending}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
          </Link>
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold text-green-600">{m.verif_approved_today}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Approved today</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold text-red-600">{m.verif_rejected_today}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Rejected today</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold">{m.total_verified_props}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total verified</p>
          </div>
        </div>
      </div>

      {/* Property breakdown */}
      {Object.keys(m.props_by_status).length > 0 && (
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Properties by Status</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(m.props_by_status).map(([status, count]) => (
              <div
                key={status}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${STATUS_BADGE_COLOR[status] ?? 'bg-gray-100 text-gray-600'}`}
              >
                <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                <span className="ml-2 font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity feed */}
      {activityRows && activityRows.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Recent Activity</h2>
          </div>
          <div className="divide-y">
            {activityRows.map((row, i) => {
              const cfg = ACTIVITY_CONFIG[row.action]
              if (!cfg) return null
              const { Icon, color } = cfg
              return (
                <div key={`${row.action}-${row.entity_id}-${i}`} className="flex items-center gap-3 px-4 py-3">
                  <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      <span className="font-medium">{row.label ?? 'Unknown'}</span>
                      {row.actor_name && (
                        <span className="text-muted-foreground"> · by {row.actor_name}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                    {formatRelative(row.occurred_at)}
                  </p>
                </div>
              )
            })}
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
                  {getInitial(u.full_name, u.display_name, u.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {u.full_name?.trim() || u.display_name?.trim() || 'Unnamed user'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{u.email?.trim() || 'No email'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {ROLE_LABELS[u.role as UserRole] ?? u.role ?? 'Unknown role'}
                  </Badge>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ACCOUNT_STATUS_COLOR[u.account_status] ?? 'bg-gray-100 text-gray-700'}`}
                  >
                    {u.account_status?.replace(/_/g, ' ') ?? 'unknown'}
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
              {m.verif_pending > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {m.verif_pending > 9 ? '9+' : m.verif_pending}
                </span>
              )}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/payouts">
              Process Payouts
              {m.pending_payouts > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {m.pending_payouts > 9 ? '9+' : m.pending_payouts}
                </span>
              )}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/escrow">
              Escrow Disputes
              {m.disputed_escrows > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {m.disputed_escrows > 9 ? '9+' : m.disputed_escrows}
                </span>
              )}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/reports">
              Reports
              {m.pending_reports > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {m.pending_reports > 9 ? '9+' : m.pending_reports}
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
