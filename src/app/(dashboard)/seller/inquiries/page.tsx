import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ChevronLeft, MessageSquare, Mail, Phone, Building2 } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { markInquiryRead } from '@/lib/actions/properties'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { formatRelative } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Inquiries' }

interface SearchParams {
  status?: string
  q?: string
}

type PropertyLite = {
  id: string
  title: string
  property_images: { url: string; is_primary: boolean; sort_order: number }[]
}

type InquiryRow = {
  id: string
  property_id: string
  name: string
  email: string
  phone: string | null
  message: string
  inquiry_type: string
  is_read: boolean
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  general: 'General',
  viewing: 'Viewing',
  offer:   'Offer',
}

function thumbnailFor(property: PropertyLite | undefined): string | null {
  if (!property || property.property_images.length === 0) return null
  const sorted = [...property.property_images].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
    return a.sort_order - b.sort_order
  })
  return sorted[0].url
}

export default async function SellerInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile || !['seller', 'agent', 'admin'].includes(profile.role)) {
    redirect('/login')
  }
  requireActiveProfile(profile)

  const params = await searchParams
  const statusFilter = params.status === 'unread' || params.status === 'read' ? params.status : undefined
  const search = params.q?.trim() || undefined

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let propsQuery = (supabase as any)
    .from('properties')
    .select('id, title, property_images(url, is_primary, sort_order)')
    .eq('owner_id', profile.id)

  if (search) propsQuery = propsQuery.ilike('title', `%${search}%`)

  const { data: myProperties } = await propsQuery as { data: PropertyLite[] | null }
  const properties = myProperties ?? []
  const propertyIds = properties.map((p) => p.id)
  const propertyById = new Map(properties.map((p) => [p.id, p]))

  let inquiries: InquiryRow[] = []
  let unreadCount = 0

  if (propertyIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let inqQuery = (supabase as any)
      .from('property_inquiries')
      .select('id, property_id, name, email, phone, message, inquiry_type, is_read, created_at')
      .in('property_id', propertyIds)
      .order('created_at', { ascending: false })
      .limit(100)

    if (statusFilter === 'unread') inqQuery = inqQuery.eq('is_read', false)
    if (statusFilter === 'read') inqQuery = inqQuery.eq('is_read', true)

    const { data: inqData } = await inqQuery as { data: InquiryRow[] | null }
    inquiries = inqData ?? []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('property_inquiries')
      .select('id', { count: 'exact', head: true })
      .in('property_id', propertyIds)
      .eq('is_read', false)
    unreadCount = count ?? 0
  }

  function buildUrl(overrides: Partial<SearchParams>) {
    const merged = { status: statusFilter, q: search, ...overrides }
    const p = new URLSearchParams()
    if (merged.status) p.set('status', merged.status)
    if (merged.q) p.set('q', merged.q)
    const qs = p.toString()
    return `/seller/inquiries${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LinkButton variant="ghost" size="icon" className="-ml-2" href="/seller/listings">
          <ChevronLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Inquiries</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <form className="rounded-xl border p-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          name="q"
          defaultValue={search ?? ''}
          placeholder="Search by property title"
          className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring sm:col-span-2"
        />
        <select
          name="status"
          defaultValue={statusFilter ?? ''}
          className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
        <div className="flex gap-2 sm:col-span-3">
          <Button type="submit" size="sm" variant="outline">Apply</Button>
          {(search || statusFilter) && (
            <LinkButton href="/seller/inquiries" variant="ghost" size="sm">Clear</LinkButton>
          )}
        </div>
      </form>

      {/* List */}
      {inquiries.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm font-medium text-muted-foreground">No inquiries found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {search || statusFilter ? 'Try clearing filters.' : 'Buyer inquiries on your listings will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => {
            const property = propertyById.get(inq.property_id)
            const thumbnail = thumbnailFor(property)

            return (
              <div
                key={inq.id}
                className={`rounded-xl border bg-card p-4 flex gap-4 ${!inq.is_read ? 'border-blue-200 bg-blue-50/40' : ''}`}
              >
                {/* Thumbnail */}
                <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnail} alt={property?.title ?? ''} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{property?.title ?? 'Property removed'}</p>
                      <p className="text-xs text-muted-foreground">
                        {inq.name} · {formatRelative(inq.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">{TYPE_LABEL[inq.inquiry_type] ?? inq.inquiry_type}</Badge>
                      <Badge variant={inq.is_read ? 'secondary' : 'default'} className="text-xs">
                        {inq.is_read ? 'Read' : 'Unread'}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm">{inq.message}</p>

                  <div className="flex items-center gap-4 text-xs flex-wrap">
                    <a href={`mailto:${inq.email}`} className="flex items-center gap-1 text-blue-700 hover:underline">
                      <Mail className="h-3.5 w-3.5" />
                      {inq.email}
                    </a>
                    {inq.phone && (
                      <a href={`tel:${inq.phone}`} className="flex items-center gap-1 text-blue-700 hover:underline">
                        <Phone className="h-3.5 w-3.5" />
                        {inq.phone}
                      </a>
                    )}
                  </div>

                  {!inq.is_read && (
                    <form action={async () => {
                      'use server'
                      await markInquiryRead(inq.id)
                    }}>
                      <Button type="submit" size="sm" variant="outline" className="mt-1">
                        Mark as read
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination note: capped — pages with very large inquiry volumes are
          out of scope for this minimal implementation */}
      {inquiries.length === 100 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing the most recent 100 inquiries. Narrow your search to see older ones.
        </p>
      )}
    </div>
  )
}
