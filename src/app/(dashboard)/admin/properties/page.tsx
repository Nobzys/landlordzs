import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Building2, ChevronLeft, CheckCircle2, XCircle, ExternalLink, RotateCcw, Ban, Search } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { reviewVerification, adminRestoreToDraft, suspendProperty, restoreSuspendedProperty } from '@/lib/actions/properties'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { formatXAF, formatRelative } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Property Verification — Admin' }

const LISTING_COLOR: Record<string, string> = {
  sale:     'bg-blue-100 text-blue-700',
  rent:     'bg-emerald-100 text-emerald-700',
  shortlet: 'bg-amber-100 text-amber-700',
}

type RejectedPropertyRow = {
  id: string
  title: string
  city: string
  price: number
  updated_at: string
  owner: { full_name: string | null; display_name: string | null; email: string } | null
}

type SuspendedPropertyRow = {
  id: string
  title: string
  city: string
  price: number
  updated_at: string
  suspension_reason: string | null
  owner: { full_name: string | null; display_name: string | null; email: string } | null
}

type ActivePropertyRow = {
  id: string
  title: string
  city: string
  price: number
  owner: { full_name: string | null; display_name: string | null; email: string } | null
}

type VerificationRow = {
  id: string
  property_id: string
  created_at: string
  property: {
    id: string
    title: string
    city: string
    listing_type: string
    property_type: string
    price: number
    owner: {
      full_name: string | null
      display_name: string | null
      email: string
    } | null
  } | null
}

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const { q } = await searchParams
  const activeSearch = q?.trim() || undefined

  const supabase = await createClient()

  const { data: raw } = await (supabase as any)
    .from('property_verifications')
    .select(`
      id, property_id, created_at,
      property:properties (
        id, title, city, listing_type, property_type, price,
        owner:profiles!properties_owner_id_fkey ( full_name, display_name, email )
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100)

  const verifications: VerificationRow[] = raw ?? []

  const { data: rejectedRaw } = await (supabase as any)
    .from('properties')
    .select(`
      id, title, city, price, updated_at,
      owner:profiles!properties_owner_id_fkey ( full_name, display_name, email )
    `)
    .eq('status', 'rejected')
    .order('updated_at', { ascending: false })
    .limit(50)

  const rejectedProperties: RejectedPropertyRow[] = rejectedRaw ?? []

  const { data: suspendedRaw } = await (supabase as any)
    .from('properties')
    .select(`
      id, title, city, price, updated_at, suspension_reason,
      owner:profiles!properties_owner_id_fkey ( full_name, display_name, email )
    `)
    .eq('status', 'suspended')
    .order('updated_at', { ascending: false })
    .limit(50)

  const suspendedProperties: SuspendedPropertyRow[] = suspendedRaw ?? []

  let activeResults: ActivePropertyRow[] = []
  if (activeSearch) {
    const { data: activeRaw } = await (supabase as any)
      .from('properties')
      .select(`
        id, title, city, price,
        owner:profiles!properties_owner_id_fkey ( full_name, display_name, email )
      `)
      .eq('status', 'active')
      .ilike('title', `%${activeSearch}%`)
      .order('title', { ascending: true })
      .limit(20)
    activeResults = activeRaw ?? []
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <LinkButton variant="ghost" size="icon" className="-ml-2" href="/admin">
            <ChevronLeft className="h-4 w-4" />
          </LinkButton>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Property Verification</h1>
              <p className="text-sm text-muted-foreground">
                {verifications.length === 0
                  ? 'No pending submissions'
                  : `${verifications.length} pending review — oldest first`}
              </p>
            </div>
          </div>
        </div>
        <LinkButton href="/admin/properties/history" variant="outline" size="sm">View Moderation History</LinkButton>
      </div>

      {verifications.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-60" />
          <p className="text-sm font-medium text-muted-foreground">All caught up — no pending verifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {verifications.map((v) => {
            const sellerName =
              v.property?.owner?.full_name ??
              v.property?.owner?.display_name ??
              v.property?.owner?.email ??
              'Unknown'

            return (
              <div key={v.id} className="rounded-xl border bg-card p-4 space-y-3">
                {/* Property info row */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm truncate">{v.property?.title ?? 'Untitled'}</h3>
                      {v.property?.listing_type && (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${LISTING_COLOR[v.property.listing_type] ?? 'bg-gray-100 text-gray-700'}`}>
                          {v.property.listing_type}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">
                      {v.property?.city ?? '—'} · {v.property?.property_type?.replace(/_/g, ' ') ?? '—'}
                    </p>
                    <p className="text-sm font-bold text-primary">{formatXAF(v.property?.price ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">
                      Submitted by{' '}
                      <span className="font-medium text-foreground">{sellerName}</span>
                      {v.property?.owner?.email && <> · {v.property.owner.email}</>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-xs text-muted-foreground">{formatRelative(v.created_at)}</p>
                    {v.property?.id && (
                      <LinkButton variant="outline" size="sm" href={`/admin/properties/${v.property.id}`} target="_blank">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        View
                      </LinkButton>
                    )}
                  </div>
                </div>

                {/* Action row */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                  {/* Approve */}
                  <form action={async () => {
                    'use server'
                    await reviewVerification(v.id, 'approved')
                  }}>
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Approve
                    </Button>
                  </form>

                  {/* Reject with optional reason */}
                  <form
                    action={async (fd: FormData) => {
                      'use server'
                      const notes = (fd.get('notes') as string | null)?.trim() || undefined
                      await reviewVerification(v.id, 'rejected', notes)
                    }}
                    className="flex flex-1 gap-2"
                  >
                    <input
                      name="notes"
                      placeholder="Rejection reason (optional)"
                      className="flex-1 min-w-0 rounded-md border px-3 py-1.5 text-xs bg-background
                        placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1.5" />
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Rejected properties — admins can restore to draft */}
      {rejectedProperties.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Rejected Properties</h2>
          {rejectedProperties.map((p) => {
            const ownerName = p.owner?.full_name ?? p.owner?.display_name ?? p.owner?.email ?? 'Unknown'
            return (
              <div key={p.id} className="rounded-xl border bg-card p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{p.title}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{p.city} · {formatXAF(p.price)}</p>
                  <p className="text-xs text-muted-foreground">Owner: {ownerName} · Rejected {formatRelative(p.updated_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <LinkButton variant="outline" size="sm" href={`/admin/properties/${p.id}`} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    View
                  </LinkButton>
                  <form action={async () => {
                    'use server'
                    await adminRestoreToDraft(p.id)
                  }}>
                    <Button type="submit" variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Restore to Draft
                    </Button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Suspended properties — admin enforcement action, restore returns to active */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Suspended Properties</h2>
        {suspendedProperties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No properties are currently suspended.</p>
        ) : (
          suspendedProperties.map((p) => {
            const ownerName = p.owner?.full_name ?? p.owner?.display_name ?? p.owner?.email ?? 'Unknown'
            return (
              <div key={p.id} className="rounded-xl border bg-card p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{p.title}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{p.city} · {formatXAF(p.price)}</p>
                  <p className="text-xs text-muted-foreground">Owner: {ownerName} · Suspended {formatRelative(p.updated_at)}</p>
                  {p.suspension_reason && (
                    <p className="text-xs text-red-700">Reason: {p.suspension_reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <LinkButton variant="outline" size="sm" href={`/admin/properties/${p.id}`} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    View
                  </LinkButton>
                  <form action={async () => {
                    'use server'
                    await restoreSuspendedProperty(p.id)
                  }}>
                    <Button type="submit" variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Restore
                    </Button>
                  </form>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Find an active property to suspend */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Suspend an Active Property</h2>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={activeSearch ?? ''}
            placeholder="Search active properties by title"
            className="flex-1 rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" variant="outline" size="sm">
            <Search className="h-3.5 w-3.5 mr-1.5" />
            Search
          </Button>
        </form>

        {activeSearch && activeResults.length === 0 && (
          <p className="text-sm text-muted-foreground">No active properties match &quot;{activeSearch}&quot;.</p>
        )}

        {activeResults.map((p) => {
          const ownerName = p.owner?.full_name ?? p.owner?.display_name ?? p.owner?.email ?? 'Unknown'
          return (
            <div key={p.id} className="rounded-xl border bg-card p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1 flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{p.title}</h3>
                <p className="text-xs text-muted-foreground capitalize">{p.city} · {formatXAF(p.price)}</p>
                <p className="text-xs text-muted-foreground">Owner: {ownerName}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <LinkButton variant="outline" size="sm" href={`/admin/properties/${p.id}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  View
                </LinkButton>
                <form
                  action={async (fd: FormData) => {
                    'use server'
                    const reason = (fd.get('reason') as string | null) ?? ''
                    await suspendProperty(p.id, reason)
                  }}
                  className="flex gap-2"
                >
                  <input
                    name="reason"
                    required
                    placeholder="Suspension reason (required)"
                    className="min-w-0 rounded-md border px-3 py-1.5 text-xs bg-background
                      placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button type="submit" variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 shrink-0">
                    <Ban className="h-3.5 w-3.5 mr-1.5" />
                    Suspend
                  </Button>
                </form>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
