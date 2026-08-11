import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, Building2, Users, Wallet, Activity, ChevronRight } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { formatXAF, formatRelative } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Agent Dashboard' }

type AgentProfileRow = {
  commission_rate: number
  listing_count:   number
  sold_count:      number
  agency_id:       string | null
  agencies:        { name: string; slug: string } | null
}

type CommissionRow = {
  amount: number
  status: 'pending' | 'paid' | 'cancelled'
}

type ActivityRow = {
  id:          string
  action:      string
  entity_type: string | null
  created_at:  string
}

export default async function AgentDashboardPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'agent') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  // Fetch all in parallel
  const [
    agentProfileRes,
    listingsRes,
    commissionsRes,
    activityRes,
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('agent_profiles')
      .select('commission_rate, listing_count, sold_count, agency_id, agencies(name, slug)')
      .eq('id', profile.id)
      .maybeSingle() as Promise<{ data: AgentProfileRow | null }>,

    (supabase as any)
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', profile.id)
      .eq('status', 'active') as Promise<{ count: number | null }>,

    (supabase as any)
      .from('commission_records')
      .select('amount, status')
      .eq('earner_id', profile.id) as Promise<{ data: CommissionRow[] | null }>,

    (supabase as any)
      .from('activity_logs')
      .select('id, action, entity_type, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5) as Promise<{ data: ActivityRow[] | null }>,
  ])

  const agentProfile   = agentProfileRes.data
  const activeListings = listingsRes.count ?? 0
  const commissions    = commissionsRes.data ?? []
  const activities     = activityRes.data ?? []

  const pendingAmount = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0)
  const totalEarned = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount, 0)

  const commissionRate = agentProfile?.commission_rate ?? 3.00
  const agency         = agentProfile?.agencies ?? null

  const stats = [
    {
      label:    'Active Listings',
      value:    String(activeListings),
      icon:     Building2,
      href:     '/seller/listings',
      color:    'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      label:    'Pending Commission',
      value:    formatXAF(pendingAmount),
      icon:     TrendingUp,
      href:     '/agent/commissions',
      color:    'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      label:    'Total Earned',
      value:    formatXAF(totalEarned),
      icon:     Wallet,
      href:     '/agent/commissions',
      color:    'bg-green-500/10 text-green-600 dark:text-green-400',
    },
    {
      label:    'Commission Rate',
      value:    `${commissionRate}%`,
      icon:     Users,
      href:     '/agent/agency',
      color:    'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back{profile.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {agency
            ? <>Agent at <Link href={`/agent/agency`} className="text-primary hover:underline">{agency.name}</Link></>
            : 'Independent agent · no agency yet'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, href, color }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border p-4 space-y-3 hover:bg-muted/40 transition-colors"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold truncate">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border p-4 space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</p>
        {[
          { label: 'New listing',      href: '/seller/listings/new', icon: Building2 },
          { label: 'My agency',        href: '/agent/agency',        icon: Users },
          { label: 'Client inquiries', href: '/agent/clients',       icon: Users },
          { label: 'My commissions',   href: '/agent/commissions',   icon: TrendingUp },
        ].map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      {activities.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Recent Activity</p>
          </div>
          <div className="rounded-xl border divide-y overflow-hidden">
            {activities.map((log) => (
              <div key={log.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs bg-muted rounded px-1.5 py-0.5 font-mono shrink-0">
                    {log.entity_type ?? 'system'}
                  </span>
                  <span className="text-sm truncate capitalize">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {formatRelative(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
