import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, MessageSquare, CheckCircle, Clock, User, Mail, Phone } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { replyToInquiry } from '@/lib/actions/properties'
import { Button } from '@/components/ui/button'
import { formatDate, formatRelative } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Inquiry — Seller' }

type InquiryDetail = {
  id: string
  property_id: string
  sender_id: string | null
  name: string
  email: string
  phone: string | null
  message: string
  inquiry_type: string
  is_read: boolean
  replied_at: string | null
  created_at: string
  properties: {
    id: string
    title: string
    slug: string
    owner_id: string
    city: string
  } | null
}

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getServerProfile()
  if (!profile || !['seller', 'agent', 'admin'].includes(profile.role)) redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inquiry } = await (supabase as any)
    .from('property_inquiries')
    .select(`
      id, property_id, sender_id, name, email, phone,
      message, inquiry_type, is_read, replied_at, created_at,
      properties (id, title, slug, owner_id, city)
    `)
    .eq('id', id)
    .single() as { data: InquiryDetail | null }

  if (!inquiry) notFound()

  // Verify this inquiry belongs to a property owned by the current user
  if (inquiry.properties?.owner_id !== profile.id && profile.role !== 'admin') {
    redirect('/seller/inquiries')
  }

  const replied = !!inquiry.replied_at
  const inquiryId = inquiry.id

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/seller/inquiries">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Inquiry</h1>
            <p className="text-sm text-muted-foreground">{formatDate(inquiry.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Property */}
      {inquiry.properties && (
        <div className="rounded-xl border p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Property
          </p>
          <Link
            href={`/properties/${inquiry.properties.slug}`}
            className="text-sm font-medium hover:underline"
          >
            {inquiry.properties.title}
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">{inquiry.properties.city}</p>
        </div>
      )}

      {/* Sender info */}
      <div className="rounded-xl border p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">From</p>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium">{inquiry.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <a
            href={`mailto:${inquiry.email}`}
            className="text-sm text-primary hover:underline break-all"
          >
            {inquiry.email}
          </a>
        </div>
        {inquiry.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <a href={`tel:${inquiry.phone}`} className="text-sm hover:underline">
              {inquiry.phone}
            </a>
          </div>
        )}
        <p className="text-xs text-muted-foreground capitalize">
          {inquiry.inquiry_type} inquiry · {formatRelative(inquiry.created_at)}
        </p>
      </div>

      {/* Message */}
      <div className="rounded-xl border p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Message</p>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{inquiry.message}</p>
      </div>

      {/* Reply */}
      <div className="rounded-xl border p-4 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reply</p>

        {replied ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Replied {formatRelative(inquiry.replied_at!)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Awaiting reply</span>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Reply directly to{' '}
          <a href={`mailto:${inquiry.email}`} className="text-primary hover:underline font-medium">
            {inquiry.email}
          </a>
          {inquiry.phone && (
            <>
              {' or '}
              <a href={`tel:${inquiry.phone}`} className="text-primary hover:underline font-medium">
                {inquiry.phone}
              </a>
            </>
          )}
          , then mark this inquiry as replied below.
        </p>

        {!replied && (
          <form
            action={async () => {
              'use server'
              await replyToInquiry(inquiryId)
            }}
          >
            <Button type="submit" size="sm">
              Mark as replied
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
