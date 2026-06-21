import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, TrendingUp, Users, Building2, ShieldCheck, Wallet } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Analytics — Admin' }

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

const ROLE_ORDER: UserRole[] = ['buyer', 'seller', 'agent', 'vendor', 'contractor', 'engineer', 'architect', 'lawyer', 'admin']

export default async function AdminAnalyticsPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawMetrics } = await (supabase as any).rpc('get_admin_metrics') as { data: AdminMetrics | null }

  const m: AdminMetrics = rawMetrics ?? {
    users_by_role: {}, new_users_today: 0,
    props_by_status: {},
    verif_pending: 0, verif_approved_today: 0, verif_rejected_today: 0, total_verified_props: 0,
    pending_payouts: 0, active_escrows: 0, disputed_escrows: 0,
    pending_reports: 0, pending_commissions: 0,
  }

  const totalUsers = Object.values(m.users_by_role).reduce((s, n) => s + n, 0)
  const totalProperties = Object.values(m.props_by_status).reduce((s, n) => s + n, 0)
  const verifTotal = m.verif_approved_today + m.verif_rejected_today
  const approvalRate = verifTotal > 0 ? Math.round((m.verif_approved_today / verifTotal) * 100) : null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground">Platform growth and verification throughput</p>
          </div>
        </div>
      </div>

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
          <p className="text-xs text-muted-foreground mt-1">{m.props_by_status['active'] ?? 0} active</p>
        </div>
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-medium">Approval Rate (today)</span>
          </div>
          <p className="text-3xl font-bold">{approvalRate !== null ? `${approvalRate}%` : '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">{verifTotal} reviewed today</p>
        </div>
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Wallet className="h-4 w-4" />
            <span className="text-xs font-medium">Pending Commissions</span>
          </div>
          <p className="text-3xl font-bold">{m.pending_commissions}</p>
          <p className="text-xs text-muted-foreground mt-1">{m.pending_payouts} payouts pending</p>
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Users by Role</h2>
        <div className="space-y-2">
          {ROLE_ORDER.map((role) => {
            const count = m.users_by_role[role] ?? 0
            const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
            return (
              <div key={role} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-32 shrink-0 truncate">{ROLE_LABELS[role]}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-medium w-10 text-right shrink-0">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Properties by Status</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(m.props_by_status).length > 0 ? (
            Object.entries(m.props_by_status).map(([status, count]) => (
              <div key={status} className="rounded-lg px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700">
                <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                <span className="ml-2 font-bold">{count}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No properties yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Verification Throughput</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold">{m.verif_pending}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
          </div>
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
    </div>
  )
}
