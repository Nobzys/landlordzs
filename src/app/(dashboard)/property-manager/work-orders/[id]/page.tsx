import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Wrench, MapPin, Calendar, User, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { getWorkOrderById, closeWorkOrder, cancelWorkOrder, disputeWorkOrder } from '@/lib/actions/workOrders'
import { formatDate, formatXAFShort } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Work Order — Property Manager' }

interface Props { params: Promise<{ id: string }> }

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  dispatched:  { label: 'Dispatched',  className: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
  accepted:    { label: 'Accepted',    className: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
  in_progress: { label: 'In Progress', className: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' },
  completed:   { label: 'Completed',   className: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' },
  closed:      { label: 'Closed',      className: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' },
  declined:    { label: 'Declined',    className: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
  cancelled:   { label: 'Cancelled',   className: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' },
  disputed:    { label: 'Disputed',    className: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' },
}

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low:    { label: 'Low',    className: 'bg-slate-100 dark:bg-slate-800 text-slate-500' },
  normal: { label: 'Normal', className: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' },
  high:   { label: 'High',   className: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
  urgent: { label: 'Urgent', className: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
}

export default async function PMWorkOrderDetailPage({ params }: Props) {
  const { id } = await params
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'property_manager') redirect('/login')
  requireActiveProfile(profile)

  const wo = await getWorkOrderById(id)
  if (!wo) notFound()

  // RLS already scopes the query, but enforce PM-only access for actions
  const isManager = wo.manager_id === profile.id

  // Generate signed URLs for completion photos (private bucket)
  let signedPhotoUrls: string[] = []
  if (wo.completion_photos.length > 0) {
    const supabase = await createClient()
    const results = await Promise.all(
      wo.completion_photos.map(path =>
        supabase.storage.from('maintenance-photos').createSignedUrl(path, 3600),
      ),
    )
    signedPhotoUrls = results.flatMap(r => r.data?.signedUrl ? [r.data.signedUrl] : [])
  }

  const status   = STATUS_CONFIG[wo.status]   ?? { label: wo.status,   className: 'bg-muted text-muted-foreground' }
  const priority = PRIORITY_CONFIG[wo.priority] ?? { label: wo.priority, className: 'bg-muted text-muted-foreground' }
  const workerName = wo.worker?.display_name ?? wo.worker?.full_name ?? wo.worker?.email ?? 'Unknown worker'
  const isTerminal = ['closed', 'declined', 'cancelled', 'disputed'].includes(wo.status)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/property-manager/work-orders"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Work Orders
      </Link>

      {/* Header card */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Wrench className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-xl font-bold truncate">{wo.title}</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <span className={`text-xs rounded-full px-2.5 py-1 ${priority.className}`}>
              {priority.label}
            </span>
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
                <p className="text-xs text-muted-foreground">{wo.property.city}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Assigned Worker</p>
              <p className="font-medium">{workerName}</p>
              {wo.worker?.email && (
                <p className="text-xs text-muted-foreground">{wo.worker.email}</p>
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
          <p>Dispatched: <span className="text-foreground">{formatDate(wo.dispatched_at)}</span></p>
          {wo.accepted_at  && <p>Accepted:    <span className="text-foreground">{formatDate(wo.accepted_at)}</span></p>}
          {wo.declined_at  && <p>Declined:    <span className="text-foreground">{formatDate(wo.declined_at)}</span></p>}
          {wo.started_at   && <p>Started:     <span className="text-foreground">{formatDate(wo.started_at)}</span></p>}
          {wo.completed_at && <p>Completed:   <span className="text-foreground">{formatDate(wo.completed_at)}</span></p>}
          {wo.closed_at    && <p>Closed:      <span className="text-foreground">{formatDate(wo.closed_at)}</span></p>}
          {wo.cancelled_at && <p>Cancelled:   <span className="text-foreground">{formatDate(wo.cancelled_at)}</span></p>}
        </div>
      </div>

      {/* Completion evidence */}
      {(wo.status === 'completed' || wo.status === 'closed' || wo.status === 'disputed') && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Completion Report</h2>

          {wo.completion_notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notes from worker</p>
              <p className="text-sm whitespace-pre-wrap">{wo.completion_notes}</p>
            </div>
          )}

          {wo.parts_cost_xaf !== null && (
            <div>
              <p className="text-xs text-muted-foreground">Parts Cost</p>
              <p className="text-sm font-medium">{formatXAFShort(wo.parts_cost_xaf)}</p>
            </div>
          )}

          {signedPhotoUrls.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Completion Photos ({signedPhotoUrls.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {signedPhotoUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square rounded-lg overflow-hidden border bg-muted hover:opacity-90 transition-opacity"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Completion photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {wo.completion_photos.length === 0 && !wo.completion_notes && wo.parts_cost_xaf === null && (
            <p className="text-sm text-muted-foreground">No completion details provided.</p>
          )}
        </div>
      )}

      {/* PM Actions */}
      {isManager && !isTerminal && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Actions</h2>

          <div className="flex flex-wrap gap-3">
            {/* Close (completed → closed) */}
            {wo.status === 'completed' && (
              <form action={async () => {
                'use server'
                await closeWorkOrder(id)
              }}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 h-9 rounded-md px-4 text-sm font-medium
                             bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Close Work Order
                </button>
              </form>
            )}

            {/* Dispute (completed → disputed) */}
            {wo.status === 'completed' && (
              <form action={async () => {
                'use server'
                await disputeWorkOrder(id)
              }}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 h-9 rounded-md px-4 text-sm font-medium
                             border border-input bg-background hover:bg-destructive/10
                             hover:text-destructive hover:border-destructive/30 transition-colors"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Dispute
                </button>
              </form>
            )}

            {/* Cancel (dispatched or accepted → cancelled) */}
            {['dispatched', 'accepted'].includes(wo.status) && (
              <form action={async () => {
                'use server'
                await cancelWorkOrder(id)
              }}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 h-9 rounded-md px-4 text-sm font-medium
                             border border-input bg-background hover:bg-destructive/10
                             hover:text-destructive hover:border-destructive/30 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Work Order
                </button>
              </form>
            )}

            {/* In-progress: no PM actions (worker must complete first) */}
            {wo.status === 'in_progress' && (
              <p className="text-sm text-muted-foreground">
                Work is in progress. Awaiting the worker to mark it as completed.
              </p>
            )}

            {/* Dispatched or accepted: note */}
            {wo.status === 'dispatched' && (
              <p className="text-sm text-muted-foreground">
                Awaiting worker response.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Terminal state notice */}
      {isTerminal && (
        <div className="rounded-xl border bg-muted/40 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            This work order is{' '}
            <span className="font-medium text-foreground">{status.label.toLowerCase()}</span>
            {' '}and requires no further action.
          </p>
        </div>
      )}

      {/* Access denied if viewer is owner (read-only) */}
      {!isManager && wo.owner_id === profile.id && (
        <div className="rounded-xl border bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">
            You are viewing this work order as the property owner. Actions are managed by the assigned Property Manager.
          </p>
        </div>
      )}
    </div>
  )
}
