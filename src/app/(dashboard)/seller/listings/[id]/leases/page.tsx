import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { FileText, Building2, CheckCircle, Clock, XCircle, Plus } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { getPropertyLeases, activateLease, terminateLease, type LeaseRow } from '@/lib/actions/leases'
import { LeaseCreateForm } from '@/components/property-manager/LeaseCreateForm'
import { formatXAFShort, formatDate } from '@/lib/utils/format'
import { LinkButton } from '@/components/ui/link-button'

export const metadata: Metadata = { title: 'Lease Agreements' }

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:      { label: 'Draft',      className: 'bg-muted text-muted-foreground' },
  active:     { label: 'Active',     className: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' },
  expired:    { label: 'Expired',    className: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
  terminated: { label: 'Terminated', className: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
}

export default async function OwnerLeasesPage({ params }: Props) {
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

  const leases = await getPropertyLeases(propertyId)
  const active     = leases.filter(l => l.status === 'active')
  const drafts     = leases.filter(l => l.status === 'draft')
  const historical = leases.filter(l => ['expired', 'terminated'].includes(l.status))

  const canCreateLease = !active.length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <FileText className="h-7 w-7 text-primary mt-0.5" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Lease Agreements</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>{property.title}</span>
            <span>·</span>
            <span>{property.city}</span>
          </div>
        </div>
        <LinkButton
          variant="outline"
          size="sm"
          href={`/seller/listings/${propertyId}/manager`}
        >
          Property Manager
        </LinkButton>
      </div>

      {/* Active lease */}
      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Active Lease
          </h2>
          {active.map(lease => (
            <LeaseDetailCard key={lease.id} lease={lease} propertyId={propertyId} showTerminate />
          ))}
        </section>
      )}

      {/* Draft leases */}
      {drafts.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Draft Leases
          </h2>
          {drafts.map(lease => (
            <LeaseDetailCard key={lease.id} lease={lease} propertyId={propertyId} showActivate />
          ))}
        </section>
      )}

      {/* Empty state */}
      {leases.length === 0 && (
        <div className="rounded-xl border bg-card p-8 text-center space-y-2">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">
            No lease agreements yet for this property.
          </p>
        </div>
      )}

      {/* Create new lease */}
      {canCreateLease && (
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">New Lease</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Search for a tenant by email and set the lease terms.
            The lease is saved as a draft — activate it when ready.
          </p>
          <LeaseCreateForm
            properties={[{ id: property.id, title: property.title, city: property.city }]}
          />
        </section>
      )}

      {/* Lease history */}
      {historical.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">History</h2>
          <div className="space-y-2">
            {historical.map(lease => (
              <LeaseDetailCard key={lease.id} lease={lease} propertyId={propertyId} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Lease detail card ────────────────────────────────────────────────────────

function LeaseDetailCard({
  lease,
  propertyId,
  showActivate = false,
  showTerminate = false,
}: {
  lease: LeaseRow
  propertyId: string
  showActivate?: boolean
  showTerminate?: boolean
}) {
  const cfg = STATUS_CONFIG[lease.status] ?? STATUS_CONFIG.draft
  const tenantName = lease.tenant?.display_name ?? lease.tenant?.full_name ?? 'Unknown Tenant'

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{tenantName}</p>
          <p className="text-sm text-muted-foreground">{lease.tenant?.email}</p>
          {lease.tenant?.phone && (
            <p className="text-xs text-muted-foreground">{lease.tenant.phone}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs rounded-full px-2 py-1 ${cfg.className}`}>
          {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Monthly Rent</p>
          <p className="font-semibold">{formatXAFShort(lease.monthly_rent)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Deposit</p>
          <p className="font-semibold">
            {lease.deposit_amount > 0 ? formatXAFShort(lease.deposit_amount) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Start Date</p>
          <p>{formatDate(lease.start_date)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">End Date</p>
          <p>{lease.end_date ? formatDate(lease.end_date) : 'Month-to-month'}</p>
        </div>
      </div>

      {lease.terms && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Lease Terms</p>
          <p className="text-sm whitespace-pre-wrap">{lease.terms}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Created {formatDate(lease.created_at)}
        {lease.activated_at  ? ` · Activated ${formatDate(lease.activated_at)}`  : ''}
        {lease.terminated_at ? ` · Terminated ${formatDate(lease.terminated_at)}` : ''}
      </p>

      {/* Action buttons */}
      <div className="flex gap-2">
        {showActivate && (
          <form action={async () => {
            'use server'
            await activateLease(lease.id)
          }}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 h-9 rounded-md px-3 text-xs font-medium
                         bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Activate Lease
            </button>
          </form>
        )}

        {showTerminate && (
          <form action={async () => {
            'use server'
            await terminateLease(lease.id)
          }}>
            <button
              type="submit"
              className="inline-flex items-center h-9 rounded-md px-3 text-xs font-medium
                         border border-input bg-background hover:bg-destructive/10
                         hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Terminate Lease
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
