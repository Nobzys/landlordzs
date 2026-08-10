import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MessageSquare, Circle } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { formatRelative } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Inquiries — Seller' }

type InquiryListRow = {
  id: string
  name: string
  email: string
  message: string
  inquiry_type: string
  is_read: boolean
  replied_at: string | null
  created_at: string
  properties: {
    id: string
    title: string
    slug: string
    property_images: { url: string; order_index: number }[]
  } | null
}

export default async function SellerInquiriesPage() {
  const profile = await getServerProfile()
  if (!profile || !['seller', 'agent', 'admin'].includes(profile.role)) redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  // Get property IDs owned by this seller (explicit ownership scope)
  const { data: ownProps } = await supabase
    .from('properties')
    .select('id')
    .eq('owner_id', profile.id) as { data: { id: string }[] | null }

  const propIds = (ownProps ?? []).map((p) => p.id)

  let inquiries: InquiryListRow[] = []
  if (propIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('property_inquiries')
      .select(`
        id, name, email, message, inquiry_type, is_read, replied_at, created_at,
        properties (id, title, slug, property_images(url, order_index))
      `)
      .in('property_id', propIds)
      .order('created_at', { ascending: false }) as { data: InquiryListRow[] | null }
    inquiries = data ?? []
  }

  const unreadCount = inquiries.filter((i) => !i.is_read).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Inquiries</h1>
          <p className="text-sm text-muted-foreground">
            {inquiries.length} total{unreadCount > 0 ? ` · ${unreadCount} new` : ''}
          </p>
        </div>
      </div>

      {inquiries.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">No inquiries yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Inquiries from buyers will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border divide-y overflow-hidden">
          {inquiries.map((inq) => {
            const prop = inq.properties
            const img = prop?.property_images
              ?.slice()
              .sort((a, b) => a.order_index - b.order_index)[0]
            return (
              <Link
                key={inq.id}
                href={`/seller/inquiries/${inq.id}`}
                className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="relative h-12 w-16 shrink-0 rounded-md overflow-hidden bg-muted">
                  {img ? (
                    <Image
                      src={img.url}
                      alt={prop?.title ?? ''}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{inq.name}</p>
                    {!inq.is_read && (
                      <Circle className="h-2 w-2 fill-primary text-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {prop?.title ?? 'Unknown property'} · {inq.inquiry_type}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{inq.message}</p>
                </div>

                <div className="shrink-0 text-right space-y-0.5">
                  <p className="text-xs text-muted-foreground">{formatRelative(inq.created_at)}</p>
                  {inq.replied_at ? (
                    <p className="text-xs text-green-600 dark:text-green-400">Replied</p>
                  ) : (
                    <p className="text-xs text-amber-600 dark:text-amber-400">Pending</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
