import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Wrench, Clock, CheckCircle, Inbox } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { getAssignedWorkOrders } from '@/lib/actions/workOrders'

export const metadata: Metadata = { title: 'Maintenance Dashboard' }

export default async function MaintenanceDashboardPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'maintenance') redirect('/login')
  requireActiveProfile(profile)

  const workOrders = await getAssignedWorkOrders()

  const dispatched  = workOrders.filter(w => w.status === 'dispatched').length
  const inProgress  = workOrders.filter(w => ['accepted', 'in_progress'].includes(w.status)).length
  const completed   = workOrders.filter(w => ['completed', 'closed'].includes(w.status)).length
  const totalActive = workOrders.filter(w => !['closed', 'declined', 'cancelled', 'disputed'].includes(w.status)).length

  const name = profile.display_name ?? profile.full_name ?? 'Worker'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Wrench className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Maintenance Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Awaiting Response</p>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{dispatched}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Active / In Progress</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{inProgress}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{completed}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="font-semibold">Quick Actions</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/maintenance/requests"
            className="flex items-center gap-2 rounded-lg border bg-background px-4 py-3 text-sm font-medium
                       hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Inbox className="h-4 w-4" />
            View All Requests
            {totalActive > 0 && (
              <span className="ml-auto text-xs rounded-full bg-primary text-primary-foreground px-2 py-0.5">
                {totalActive}
              </span>
            )}
          </Link>
          {dispatched > 0 && (
            <Link
              href="/maintenance/requests"
              className="flex items-center gap-2 rounded-lg border border-amber-300 dark:border-amber-700
                         bg-amber-50 dark:bg-amber-950 px-4 py-3 text-sm font-medium
                         text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
            >
              <Clock className="h-4 w-4" />
              {dispatched} {dispatched === 1 ? 'order' : 'orders'} awaiting your response
            </Link>
          )}
        </div>
      </div>

      {/* Empty state */}
      {workOrders.length === 0 && (
        <div className="rounded-xl border bg-card p-12 text-center space-y-2">
          <CheckCircle className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
          <p className="font-medium">No work orders yet</p>
          <p className="text-sm text-muted-foreground">
            A Property Manager will assign maintenance work orders to you here.
          </p>
        </div>
      )}
    </div>
  )
}
