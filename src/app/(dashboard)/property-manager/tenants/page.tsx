import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Users, FileText, CheckCircle, Clock, XCircle, Plus } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { getManagedLeases, getManagedProperties, activateLease, terminateLease, type LeaseRow } from '@/lib/actions/leases'
import { LeaseCreateForm } from '@/components/property-manager/LeaseCreateForm'
import { formatXAFShort, formatDate } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Tenants — Property Manager' }

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.FC<any> }> = {
  draft:      { label: 'Draft',      className: 'bg-muted text-muted-foreground',                                     icon: Clock },
  active:     { label: 'Active',     className: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',  icon: CheckCircle },
  expired:    { label: 'Expired',    className: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',  icon: Clock },
  terminated: { label: 'Terminated', className: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',          icon: XCircle },
}

export default async function PropertyManagerTenantsPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'property_manager') redirect('/login')
  requireActiveProfile(profile)

  const [leases, managedProperties] = await Promise.all([
    getManagedLeases(),
    getManagedProperties(),
  ])

  const active     = leases.filter(l => l.status === 'active')
  const drafts     = leases.filter(l => l.status === 'draft')
  const historical = leases.filter(l => ['expired', 'terminated'].includes(l.status))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            Lease agreements across your managed properties
          </p>
        </div>
      </div>

      {/* Active leases */}
      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Active Leases
            <span className="ml-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs px-2 py-0.5">
              {active.length}
            </span>
          </h2>
          <div className="space-y-3">
            {active.map(lease => (
              <LeaseCard key={lease.id} lease={lease} showActions />
            ))}
          </div>
        </section>
      )}

      {/* Draft leases */}
      {drafts.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Draft Leases
            <span className="ml-1 rounded-full bg-muted text-muted-foreground text-xs px-2 py-0.5">
              {drafts.length}
            </span>
          </h2>
          <div className="space-y-3">
            {drafts.map(lease => (
              <LeaseCard key={lease.id} lease={lease} showActivate />
            ))}
          </div>
        </section>
      )}

      {/* Empty state when no active/draft leases */}
      {active.length === 0 && drafts.length === 0 && (
        <div className="rounded-xl border bg-card p-10 text-center space-y-2">
          <Users className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
          <p className="font-medium">No active leases</p>
          <p className="text-sm text-muted-foreground">
            Create a lease below to assign a tenant to one of your managed properties.
          </p>
        </div>
      )}

      {/* Create new lease */}
      {managedProperties.length > 0 && (
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">New Lease</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Search for a tenant by email and fill in the lease details.
            The lease is saved as a draft — activate it when ready.
          </p>
          <LeaseCreateForm properties={managedProperties} />
        </section>
      )}

      {managedProperties.length === 0 && leases.length === 0 && (
        <div className="rounded-xl border bg-card p-8 text-center space-y-2">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">
            You have no active property management assignments.
            Accept a pending request from the My Properties page to begin managing properties.
          </p>
        </div>
      )}

      {/* Historical leases */}
      {historical.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">History</h2>
          <div className="space-y-2">
            {historical.map(lease => (
              <LeaseCard key={lease.id} lease={lease} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Lease card (shared between active, draft, and historical sections) ────────

function LeaseCard({
  lease,
  showActions = false,
  showActivate = false,
}: {
  lease: LeaseRow
  showActions?: boolean
  showActivate?: boolean
}) {
  const cfg = STATUS_CONFIG[lease.status] ?? STATUS_CONFIG.draft
  const tenantName = lease.tenant?.display_name ?? lease.tenant?.full_name ?? 'Unknown Tenant'

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5 min-w-0">
          <p className="font-medium truncate">{lease.property?.title ?? 'Unknown property'}</p>
          <p className="text-sm text-muted-foreground">
            {lease.property?.city}{lease.property?.address ? ` · ${lease.property.address}` : ''}
          </p>
        </div>
        <span className={`shrink-0 text-xs rounded-full px-2 py-1 ${cfg.className}`}>
          {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Tenant</p>
          <p className="font-medium">{tenantName}</p>
          <p className="text-xs text-muted-foreground">{lease.tenant?.email}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Monthly Rent</p>
          <p className="font-medium">{formatXAFShort(lease.monthly_rent)}</p>
          {lease.deposit_amount > 0 && (
            <p className="text-xs text-muted-foreground">Deposit: {formatXAFShort(lease.deposit_amount)}</p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Start: {formatDate(lease.start_date)}
        {lease.end_date ? ` · End: ${formatDate(lease.end_date)}` : ' · Month-to-month'}
        {lease.activated_at ? ` · Activated: ${formatDate(lease.activated_at)}` : ''}
        {lease.terminated_at ? ` · Terminated: ${formatDate(lease.terminated_at)}` : ''}
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

        {showActions && lease.status === 'active' && (
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
              Terminate Lease
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
