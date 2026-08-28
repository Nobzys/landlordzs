import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Building2, Clock, CheckCircle } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { getMyAssignments } from '@/lib/actions/assignments'
import { respondToAssignmentRequest, endPropertyAssignment } from '@/lib/actions/assignments'
import { formatXAFShort } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'My Properties — Property Manager' }

export default async function PropertyManagerPropertiesPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'property_manager') redirect('/login')
  requireActiveProfile(profile)

  const assignments = await getMyAssignments()
  const pending = assignments.filter(a => a.status === 'requested')
  const active  = assignments.filter(a => a.status === 'active')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Building2 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">My Properties</h1>
          <p className="text-sm text-muted-foreground">
            Properties assigned to you for management
          </p>
        </div>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Clock className="h-4 w-4 text-amber-500" />
            Pending Requests
            <span className="ml-1 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5">
              {pending.length}
            </span>
          </h2>
          <div className="space-y-3">
            {pending.map(a => (
              <div key={a.id} className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="font-medium">{a.property?.title ?? 'Unnamed property'}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.property?.city}{a.property?.address ? ` · ${a.property.address}` : ''}
                    </p>
                    {a.property?.price && (
                      <p className="text-sm text-muted-foreground">
                        {formatXAFShort(a.property.price)} · {a.property.listing_type}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-2 py-1">
                    Pending
                  </span>
                </div>
                {a.owner && (
                  <p className="text-sm text-muted-foreground">
                    From: {a.owner.display_name ?? a.owner.full_name ?? a.owner.email}
                  </p>
                )}
                <div className="flex gap-2">
                  <form action={async () => {
                    'use server'
                    await respondToAssignmentRequest(a.id, 'active')
                  }}>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 h-9 rounded-md px-3 text-xs font-medium
                                 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Accept
                    </button>
                  </form>
                  <form action={async () => {
                    'use server'
                    await respondToAssignmentRequest(a.id, 'declined')
                  }}>
                    <button
                      type="submit"
                      className="inline-flex items-center h-9 rounded-md px-3 text-xs font-medium
                                 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active assignments */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CheckCircle className="h-4 w-4 text-green-500" />
          Active Assignments
          <span className="ml-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs px-2 py-0.5">
            {active.length}
          </span>
        </h2>

        {active.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center space-y-2">
            <Building2 className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">
              No active assignments. Accept a pending request to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map(a => (
              <div key={a.id} className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="font-medium">{a.property?.title ?? 'Unnamed property'}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.property?.city}{a.property?.address ? ` · ${a.property.address}` : ''}
                    </p>
                    {a.property?.price && (
                      <p className="text-sm text-muted-foreground">
                        {formatXAFShort(a.property.price)} · {a.property.listing_type}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1">
                    Active
                  </span>
                </div>
                {a.owner && (
                  <p className="text-sm text-muted-foreground">
                    Owner: {a.owner.display_name ?? a.owner.full_name ?? a.owner.email}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {a.management_type.replace(/_/g, ' ')} management
                  {a.accepted_at ? ` · Active since ${new Date(a.accepted_at).toLocaleDateString()}` : ''}
                </p>
                <form action={async () => {
                  'use server'
                  await endPropertyAssignment(a.id)
                }}>
                  <button
                    type="submit"
                    className="inline-flex items-center h-9 rounded-md px-3 text-xs font-medium
                               border border-input bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                  >
                    End Assignment
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      {pending.length === 0 && active.length === 0 && (
        <div className="rounded-xl border bg-card p-10 text-center space-y-2">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
          <p className="font-medium">No assignments yet</p>
          <p className="text-sm text-muted-foreground">
            Property owners will send you requests from their listings.
          </p>
        </div>
      )}
    </div>
  )
}
