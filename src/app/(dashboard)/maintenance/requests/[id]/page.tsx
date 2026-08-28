import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Wrench, MapPin, Calendar, User, CheckCircle2, XCircle, PlayCircle } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import {
  getWorkOrderById,
  respondToWorkOrder,
  markWorkOrderStarted,
} from '@/lib/actions/workOrders'
import { WorkOrderCompleteForm } from '@/components/maintenance/WorkOrderCompleteForm'
import { formatDate, formatXAFShort } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Work Order — Maintenance' }

interface Props { params: Promise<{ id: string }> }

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  dispatched:  { label: 'Awaiting Your Response', className: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
  accepted:    { label: 'Accepted',               className: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
  in_progress: { label: 'In Progress',            className: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' },
  completed:   { label: 'Completed',              className: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' },
  closed:      { label: 'Closed',                 className: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' },
  declined:    { label: 'Declined',               className: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
  cancelled:   { label: 'Cancelled',              className: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' },
  disputed:    { label: 'Disputed',               className: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' },
}

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low:    { label: 'Low',    className: 'bg-slate-100 dark:bg-slate-800 text-slate-500' },
  normal: { label: 'Normal', className: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' },
  high:   { label: 'High',   className: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
  urgent: { label: 'Urgent', className: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
}

export default async function MaintenanceRequestDetailPage({ params }: Props) {
  const { id } = await params
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'maintenance') redirect('/login')
  requireActiveProfile(profile)

  const wo = await getWorkOrderById(id)
  if (!wo) notFound()

  // Safety check: only the assigned worker can act
  const isWorker = wo.worker_id === profile.id

  const status   = STATUS_CONFIG[wo.status]   ?? { label: wo.status,   className: 'bg-muted text-muted-foreground' }
  const priority = PRIORITY_CONFIG[wo.priority] ?? { label: wo.priority, className: 'bg-muted text-muted-foreground' }
  const managerName = wo.manager?.display_name ?? wo.manager?.full_name ?? wo.manager?.email ?? 'Property Manager'
  const isTerminal  = ['closed', 'declined', 'cancelled', 'disputed'].includes(wo.status)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/maintenance/requests"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← My Requests
      </Link>

      {/* Header card */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Wrench className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-xl font-bold truncate">{wo.title}</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            {wo.priority !== 'normal' && (
              <span className={`text-xs rounded-full px-2.5 py-1 ${priority.className}`}>
                {priority.label}
              </span>
            )}
            <span className={`text-xs rounded-full px-2.5 py-1 ${status.className}`}>
              {status.label}
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{wo.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border-t pt-4">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Property</p>
              <p className="font-medium">{wo.property?.title ?? 'Unknown'}</p>
              {wo.property?.city && (
                <p className="text-xs text-muted-foreground">
                  {wo.property.city}{wo.property.address ? ` · ${wo.property.address}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Dispatched By</p>
              <p className="font-medium">{managerName}</p>
              {wo.manager?.email && (
                <p className="text-xs text-muted-foreground">{wo.manager.email}</p>
              )}
            </div>
          </div>
          {wo.category && (
            <div>
              <p className="text-xs text-muted-foreground">Category</p>
              <p className="font-medium">{wo.category}</p>
            </div>
          )}
          {wo.due_date && (
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p className="font-medium">{formatDate(wo.due_date)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="font-semibold text-sm">Timeline</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Received:   <span className="text-foreground">{formatDate(wo.dispatched_at)}</span></p>
          {wo.accepted_at  && <p>Accepted:    <span className="text-foreground">{formatDate(wo.accepted_at)}</span></p>}
          {wo.declined_at  && <p>Declined:    <span className="text-foreground">{formatDate(wo.declined_at)}</span></p>}
          {wo.started_at   && <p>Started:     <span className="text-foreground">{formatDate(wo.started_at)}</span></p>}
          {wo.completed_at && <p>Completed:   <span className="text-foreground">{formatDate(wo.completed_at)}</span></p>}
          {wo.closed_at    && <p>Closed:      <span className="text-foreground">{formatDate(wo.closed_at)}</span></p>}
          {wo.cancelled_at && <p>Cancelled:   <span className="text-foreground">{formatDate(wo.cancelled_at)}</span></p>}
        </div>
      </div>

      {/* Completion summary (completed/closed/disputed) */}
      {['completed', 'closed', 'disputed'].includes(wo.status) && (
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <h2 className="font-semibold">Your Completion Report</h2>
          {wo.completion_notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{wo.completion_notes}</p>
            </div>
          )}
          {wo.parts_cost_xaf !== null && (
            <div>
              <p className="text-xs text-muted-foreground">Parts Cost</p>
              <p className="text-sm font-medium">{formatXAFShort(wo.parts_cost_xaf)}</p>
            </div>
          )}
          {wo.completion_photos.length > 0 && (
            <p className="text-xs text-muted-foreground">{wo.completion_photos.length} photo(s) submitted.</p>
          )}
          {wo.status === 'disputed' && (
            <p className="text-sm text-purple-700 dark:text-purple-300">
              The Property Manager has disputed the quality of this work. Please contact them directly.
            </p>
          )}
        </div>
      )}

      {/* Worker Actions */}
      {isWorker && !isTerminal && wo.status !== 'completed' && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Actions</h2>

          {/* Accept / Decline */}
          {wo.status === 'dispatched' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Review the work order above and respond to the Property Manager.
              </p>
              <div className="flex gap-3">
                <form action={async () => {
                  'use server'
                  await respondToWorkOrder(id, 'accepted')
                }}>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 h-9 rounded-md px-4 text-sm font-medium
                               bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Accept
                  </button>
                </form>
                <form action={async () => {
                  'use server'
                  await respondToWorkOrder(id, 'declined')
                }}>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 h-9 rounded-md px-4 text-sm font-medium
                               border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    Decline
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Start work */}
          {wo.status === 'accepted' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You have accepted this work order. When you arrive on site and begin work, mark it as started.
              </p>
              <form action={async () => {
                'use server'
                await markWorkOrderStarted(id)
              }}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 h-9 rounded-md px-4 text-sm font-medium
                             bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <PlayCircle className="h-4 w-4" />
                  Start Work
                </button>
              </form>
            </div>
          )}

          {/* Complete work */}
          {wo.status === 'in_progress' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Work is in progress. When the job is done, submit your completion report.
              </p>
              <WorkOrderCompleteForm workOrderId={wo.id} workerId={profile.id} />
            </div>
          )}
        </div>
      )}

      {/* Terminal or already completed — no further actions */}
      {(isTerminal || wo.status === 'completed') && !['completed', 'closed', 'disputed'].includes(wo.status) && (
        <div className="rounded-xl border bg-muted/40 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            This work order is{' '}
            <span className="font-medium text-foreground">{status.label.toLowerCase()}</span>.
            No further actions are required.
          </p>
        </div>
      )}

      {wo.status === 'completed' && (
        <div className="rounded-xl border bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-sm text-green-800 dark:text-green-200">
            Your completion report has been submitted. Awaiting the Property Manager to close this work order.
          </p>
        </div>
      )}
    </div>
  )
}
