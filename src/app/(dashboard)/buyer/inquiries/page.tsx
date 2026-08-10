import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { InquiryCard } from '@/components/properties/InquiryCard'

export const metadata: Metadata = { title: 'My Inquiries — Buyer' }

type InquiryRow = {
  id: string
  message: string
  inquiry_type: string
  is_read: boolean
  replied_at: string | null
  created_at: string
  properties: {
    id: string
    title: string
    slug: string
    city: string
    property_images: { url: string; order_index: number }[]
  } | null
}

export default async function BuyerInquiriesPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'buyer') redirect('/login')

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (supabase as any)
    .from('property_inquiries')
    .select(`
      id, message, inquiry_type, is_read, replied_at, created_at,
      properties (
        id, title, slug, city,
        property_images ( url, order_index )
      )
    `)
    .eq('sender_id', profile.id)
    .order('created_at', { ascending: false }) as { data: InquiryRow[] | null }

  const inquiries = raw ?? []

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">My Inquiries</h1>
          <p className="text-sm text-muted-foreground">Property inquiries you&apos;ve sent</p>
        </div>
      </div>

      {inquiries.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">No inquiries yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            When you contact a seller, your inquiry will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => (
            <InquiryCard
              key={inq.id}
              id={inq.id}
              message={inq.message}
              inquiry_type={inq.inquiry_type}
              is_read={inq.is_read}
              replied_at={inq.replied_at}
              created_at={inq.created_at}
              property={inq.properties}
            />
          ))}
        </div>
      )}
    </div>
  )
}
