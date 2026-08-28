import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { FileText, Building2, CheckCircle, Clock, XCircle } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { getMyLeases, type LeaseRow } from '@/lib/actions/leases'
import { formatXAFShort, formatDate } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'My Lease' }

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.FC<{ className?: string }> }> = {
  draft:      { label: 'Draft',      className: 'bg-muted text-muted-foreground',                                     icon: Clock },
  active:     { label: 'Active',     className: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',  icon: CheckCircle },
  expired:    { label: 'Expired',    className: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',  icon: Clock },
  terminated: { label: 'Terminated', className: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',          icon: XCircle },
}

export default async function AccountLeasesPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  requireActiveProfile(profile)

  const leases = await getMyLeases()
  const active     = leases.filter(l => l.status === 'active')
  const drafts     = leases.filter(l => l.status === 'draft')
  const historical = leases.filter(l => ['expired', 'terminated'].includes(l.status))

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">My Lease</h1>
          <p className="text-sm text-muted-foreground">
            Lease agreements you are a tenant on
          </p>
        </div>
      </div>

      {/* Active lease */}
      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Active Lease
          </h2>
          {active.map(lease => (
            <TenantLeaseCard key={lease.id} lease={lease} />
          ))}
        </section>
      )}

      {/* Pending draft (PM created but not yet activated) */}
      {drafts.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Pending Activation
          </h2>
          {drafts.map(lease => (
            <TenantLeaseCard key={lease.id} lease={lease} />
          ))}
        </section>
      )}

      {/* Empty state */}
      {leases.length === 0 && (
        <div className="rounded-xl border bg-card p-12 text-center space-y-2">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
          <p className="font-medium">No lease agreements</p>
          <p className="text-sm text-muted-foreground">
            When a property owner or manager creates a lease for you,
            it will appear here.
          </p>
        </div>
      )}

      {/* Historical */}
      {historical.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Past Leases</h2>
          <div className="space-y-2">
            {historical.map(lease => (
              <TenantLeaseCard key={lease.id} lease={lease} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Tenant lease card (read-only) ────────────────────────────────────────────

function TenantLeaseCard({
  lease,
  compact = false,
}: {
  lease: LeaseRow
  compact?: boolean
}) {
  const cfg = STATUS_CONFIG[lease.status] ?? STATUS_CONFIG.draft
  const StatusIcon = cfg.icon

  return (
    <div className={`rounded-xl border bg-card ${compact ? 'p-4' : 'p-5'} space-y-4`}>
      {/* Property info */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="font-medium truncate">{lease.property?.title ?? 'Property'}</p>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            {lease.property?.city}
            {lease.property?.address ? ` · ${lease.property.address}` : ''}
          </p>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 text-xs rounded-full px-2 py-1 ${cfg.className}`}>
          <StatusIcon className="h-3 w-3" />
          {cfg.label}
        </span>
      </div>

      {!compact && (
        <>
          {/* Financial details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Monthly Rent</p>
              <p className="font-semibold">{formatXAFShort(lease.monthly_rent)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Security Deposit</p>
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

          {/* Lease terms */}
          {lease.terms && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Lease Terms</p>
              <p className="text-sm whitespace-pre-wrap">{lease.terms}</p>
            </div>
          )}

          {/* Landlord info */}
          {lease.owner && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Landlord</p>
              <p className="font-medium">
                {lease.owner.display_name ?? lease.owner.full_name ?? 'Property Owner'}
              </p>
              <p className="text-xs text-muted-foreground">{lease.owner.email}</p>
            </div>
          )}
        </>
      )}

      {compact && (
        <p className="text-sm text-muted-foreground">
          {formatXAFShort(lease.monthly_rent)}/mo ·{' '}
          {formatDate(lease.start_date)}
          {lease.end_date ? ` – ${formatDate(lease.end_date)}` : ''}
        </p>
      )}
    </div>
  )
}
