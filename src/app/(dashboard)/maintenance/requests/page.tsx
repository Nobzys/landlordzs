import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, Clock, Inbox, Archive } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { getAssignedWorkOrders, type WorkOrderRow } from '@/lib/actions/workOrders'
import { formatDate } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'My Requests — Maintenance' }

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  dispatched:  { label: 'Awaiting Response', className: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
  accepted:    { label: 'Accepted',          className: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
  in_progress: { label: 'In Progress',       className: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' },
  completed:   { label: 'Completed',         className: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' },
  closed:      { label: 'Closed',            className: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' },
  declined:    { label: 'Declined',          className: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
  cancelled:   { label: 'Cancelled',         className: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' },
  disputed:    { label: 'Disputed',          className: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' },
}

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  high:   { label: 'High',   className: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
  urgent: { label: 'Urgent', className: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
}

const ACTIVE_STATUSES   = new Set(['dispatched', 'accepted', 'in_progress'])
const PENDING_STATUSES  = new Set(['completed'])
const ARCHIVE_STATUSES  = new Set(['closed', 'declined', 'cancelled', 'disputed'])

export default async function MaintenanceRequestsPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'maintenance') redirect('/login')
  requireActiveProfile(profile)

  const workOrders = await getAssignedWorkOrders()

  const active   = workOrders.filter(w => ACTIVE_STATUSES.has(w.status))
  const pending  = workOrders.filter(w => PENDING_STATUSES.has(w.status))
  const archived = workOrders.filter(w => ARCHIVE_STATUSES.has(w.status))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ClipboardList className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">My Requests</h1>
          <p className="text-sm text-muted-foreground">
            Work orders assigned to you
          </p>
        </div>
      </div>

      {/* Active */}
      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Clock className="h-4 w-4 text-amber-500" />
            Active
            <span className="ml-1 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5">
              {active.length}
            </span>
          </h2>
          <div className="space-y-3">
            {active.map(wo => <RequestCard key={wo.id} wo={wo} />)}
          </div>
        </section>
      )}

      {/* Awaiting closure (completed by worker, PM reviewing) */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Clock className="h-4 w-4 text-green-500" />
            Awaiting Closure
            <span className="ml-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs px-2 py-0.5">
              {pending.length}
            </span>
          </h2>
          <div className="space-y-3">
            {pending.map(wo => <RequestCard key={wo.id} wo={wo} />)}
          </div>
        </section>
      )}

      {/* Empty */}
      {active.length === 0 && pending.length === 0 && (
        <div className="rounded-xl border bg-card p-12 text-center space-y-2">
          <Inbox className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
          <p className="font-medium">No active work orders</p>
          <p className="text-sm text-muted-foreground">
            Work orders assigned to you by a Property Manager will appear here.
          </p>
        </div>
      )}

      {/* History */}
      {archived.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Archive className="h-4 w-4" />
            History
          </h2>
          <div className="space-y-2">
            {archived.map(wo => <RequestCard key={wo.id} wo={wo} compact />)}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Request Card ──────────────────────────────────────────────────────────────

function RequestCard({ wo, compact = false }: { wo: WorkOrderRow; compact?: boolean }) {
  const status   = STATUS_CONFIG[wo.status]   ?? { label: wo.status,   className: 'bg-muted text-muted-foreground' }
  const priority = PRIORITY_CONFIG[wo.priority]
  const managerName = wo.manager?.display_name ?? wo.manager?.full_name ?? wo.manager?.email ?? 'Property Manager'

  return (
    <Link
      href={`/maintenance/requests/${wo.id}`}
      className="block rounded-xl border bg-card p-4 space-y-2 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{wo.title}</p>
          <p className="text-sm text-muted-foreground truncate">
            {wo.property?.title ?? 'Unknown property'}{wo.property?.city ? ` · ${wo.property.city}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs rounded-full px-2 py-0.5 ${status.className}`}>
            {status.label}
          </span>
          {!compact && priority && (
            <span className={`text-xs rounded-full px-2 py-0.5 ${priority.className}`}>
              {priority.label}
            </span>
          )}
        </div>
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>From: {managerName}</span>
          {wo.due_date && <span>Due: {formatDate(wo.due_date)}</span>}
          <span>Received: {formatDate(wo.dispatched_at)}</span>
        </div>
      )}
      {compact && (
        <p className="text-xs text-muted-foreground">
          {managerName} · {formatDate(wo.dispatched_at)}
        </p>
      )}
    </Link>
  )
}
