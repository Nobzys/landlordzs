import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Building2, ChevronLeft, CheckCircle2, XCircle, ExternalLink, Eye } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { reviewVerification } from '@/lib/actions/properties'
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
    } | null
  } | null
}

export default async function AdminPropertiesPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const supabase = await createClient()

  // Note: `email` is intentionally excluded from this embedded select.
  // profiles.email is masked from `authenticated` at the column-privilege
  // level (see 20260624000001_profiles_safe_view.sql) and an embedded
  // join still requires that privilege even when nested, so including it
  // here made the whole query fail silently (data swallowed below).
  const { data: raw } = await (supabase as any)
    .from('property_verifications')
    .select(`
      id, property_id, created_at,
      property:properties (
        id, title, city, listing_type, property_type, price,
        owner:profiles!properties_owner_id_fkey ( full_name, display_name )
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100)

  const verifications: VerificationRow[] = raw ?? []

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
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
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-xs text-muted-foreground">{formatRelative(v.created_at)}</p>
                    {v.property?.id && (
                      <>
                        <LinkButton variant="ghost" size="sm" href={`/properties/${v.property.id}`} target="_blank" title="Open the public listing page">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Preview
                        </LinkButton>
                        <LinkButton variant="outline" size="sm" href={`/admin/properties/${v.property.id}`} target="_blank" title="Open the full verification details page">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          View
                        </LinkButton>
                      </>
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
    </div>
  )
}
