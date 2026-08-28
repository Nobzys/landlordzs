import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { KeyRound, Building2, CheckCircle, Clock, History } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { getPropertyAssignments, cancelAssignmentRequest, endPropertyAssignment } from '@/lib/actions/assignments'
import { AssignmentRequestForm } from '@/components/property-manager/AssignmentRequestForm'
import { formatDate } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Manage Property Manager' }

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_LABEL: Record<string, string> = {
  requested: 'Pending',
  active:    'Active',
  declined:  'Declined',
  cancelled: 'Cancelled',
  ended:     'Ended',
}

export default async function SellerListingManagerPage({ params }: Props) {
  const { id: propertyId } = await params

  const profile = await getServerProfile()
  if (!profile || !['seller', 'agent', 'admin'].includes(profile.role)) {
    redirect('/login')
  }
  requireActiveProfile(profile)

  // Verify ownership
  const supabase = await createClient()
  const { data: property } = await (supabase as any)
    .from('properties')
    .select('id, title, city, status')
    .eq('id', propertyId)
    .eq('owner_id', profile.id)
    .single()
  if (!property) notFound()

  const assignments = await getPropertyAssignments(propertyId)
  const active  = assignments.find(a => a.status === 'active')
  const pending = assignments.find(a => a.status === 'requested')
  const history = assignments.filter(a => !['active', 'requested'].includes(a.status))

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <KeyRound className="h-7 w-7 text-primary mt-0.5" />
        <div>
          <h1 className="text-2xl font-bold">Property Manager</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>{property.title}</span>
            <span>·</span>
            <span>{property.city}</span>
          </div>
        </div>
      </div>

      {/* State: Active assignment */}
      {active && (
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h2 className="text-base font-semibold">Active Property Manager</h2>
          </div>
          <div className="space-y-1">
            <p className="font-medium">
              {active.manager?.display_name ?? active.manager?.full_name ?? 'Property Manager'}
            </p>
            <p className="text-sm text-muted-foreground">{active.manager?.email}</p>
            <p className="text-sm text-muted-foreground">
              {active.management_type.replace(/_/g, ' ')} management
              {active.accepted_at ? ` · Active since ${formatDate(active.accepted_at)}` : ''}
            </p>
          </div>
          <form action={async () => {
            'use server'
            await endPropertyAssignment(active.id)
          }}>
            <button
              type="submit"
              className="inline-flex items-center h-9 rounded-md px-4 text-sm font-medium
                         border border-input bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              End Assignment
            </button>
          </form>
        </section>
      )}

      {/* State: Pending request */}
      {!active && pending && (
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-semibold">Pending Request</h2>
          </div>
          <div className="space-y-1">
            <p className="font-medium">
              {pending.manager?.display_name ?? pending.manager?.full_name ?? 'Property Manager'}
            </p>
            <p className="text-sm text-muted-foreground">{pending.manager?.email}</p>
            <p className="text-sm text-muted-foreground">
              Requested {formatDate(pending.requested_at)} · Awaiting response
            </p>
          </div>
          <form action={async () => {
            'use server'
            await cancelAssignmentRequest(pending.id)
          }}>
            <button
              type="submit"
              className="inline-flex items-center h-9 rounded-md px-4 text-sm font-medium
                         border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Cancel Request
            </button>
          </form>
        </section>
      )}

      {/* State: No current assignment — show request form */}
      {!active && !pending && (
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Assign a Property Manager</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Find a Property Manager by email and send them a management request.
              They will need to accept before gaining access.
            </p>
          </div>
          <AssignmentRequestForm propertyId={propertyId} />
        </section>
      )}

      {/* Assignment history */}
      {history.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <History className="h-4 w-4" />
            History
          </div>
          <div className="space-y-2">
            {history.map(a => (
              <div key={a.id} className="rounded-lg border p-4 space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium">
                    {a.manager?.display_name ?? a.manager?.full_name ?? a.manager?.email ?? 'Unknown Manager'}
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Requested {formatDate(a.requested_at)}
                  {a.accepted_at ? ` · Accepted ${formatDate(a.accepted_at)}` : ''}
                  {a.ended_at    ? ` · Ended ${formatDate(a.ended_at)}`       : ''}
                  {a.declined_at ? ` · Declined ${formatDate(a.declined_at)}` : ''}
                  {a.cancelled_at ? ` · Cancelled ${formatDate(a.cancelled_at)}` : ''}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
