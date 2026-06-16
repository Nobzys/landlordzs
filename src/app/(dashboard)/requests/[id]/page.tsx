import type { Metadata } from 'next'
import { notFound, forbidden } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin, Phone, MessageSquare, DollarSign, ArrowLeft } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { RequestStatusBadge } from '@/components/service-requests/RequestStatusBadge'
import {
  acceptServiceRequest,
  rejectServiceRequest,
  markRequestInProgress,
  markRequestCompleted,
  cancelServiceRequest,
} from '@/lib/actions/service-requests'
import { canAccessAdmin } from '@/lib/roles'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'
import { REQUEST_TYPES_BY_ROLE } from '@/types/service-request'
import { formatDate, formatXAFShort } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Service Request' }

interface Params { id: string }

export default async function RequestDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params
  const profile = await getServerProfile()
  if (!profile) forbidden()

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: req } = await (supabase as any)
    .from('service_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle() as { data: any | null }

  if (!req) notFound()

  const userId      = profile!.id
  const isRequester = req.client_id === userId
  const isProvider  = req.provider_id === userId
  const isAdmin     = canAccessAdmin(profile!.role)

  if (!isRequester && !isProvider && !isAdmin) forbidden()

  const [requesterRes, providerRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('profiles')
      .select('id, full_name, display_name, avatar_url, city, role, slug')
      .eq('id', req.client_id)
      .maybeSingle(),

    req.provider_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase as any)
          .from('profiles')
          .select('id, full_name, display_name, avatar_url, city, role, slug')
          .eq('id', req.provider_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requester = requesterRes.data as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider  = providerRes.data as any

  const showMessages = ['accepted', 'in_progress', 'completed', 'disputed'].includes(req.status)
  let conversationId: string | null = null
  if (showMessages) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conv } = await (supabase as any)
      .from('conversations')
      .select('id')
      .eq('context_type', 'service_request')
      .eq('context_id', id)
      .maybeSingle() as { data: { id: string } | null }
    conversationId = conv?.id ?? null
  }

  let hasReview = false
  if (req.status === 'completed' && isRequester) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: review } = await (supabase as any)
      .from('reviews')
      .select('id')
      .eq('reviewer_id', userId)
      .eq('target_type', 'service_request')
      .eq('target_id', id)
      .maybeSingle()
    hasReview = !!review
  }

  const allTypes = Object.values(REQUEST_TYPES_BY_ROLE).flat()
  const requestTypeLabel = allTypes.find(t => t.value === req.request_type)?.label
    ?? req.request_type?.replace(/_/g, ' ')
    ?? '—'

  const providerName   = provider?.display_name ?? provider?.full_name ?? 'Professional'
  const requesterName  = requester?.display_name ?? requester?.full_name ?? 'Client'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <LinkButton variant="ghost" size="icon" href={isProvider ? '/account/leads' : '/account/requests'} className="-ml-2 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold truncate">{req.title}</h1>
            <RequestStatusBadge status={req.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {requestTypeLabel} · {formatDate(req.created_at)}
          </p>
        </div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</p>
          <div className="flex items-center gap-3">
            <PartyAvatar name={requesterName} initial={requesterName.charAt(0).toUpperCase()} avatarUrl={requester?.avatar_url} />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{requesterName}</p>
              <p className="text-xs text-muted-foreground capitalize">{ROLE_LABELS[requester?.role as UserRole] ?? requester?.role}</p>
              {requester?.city && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                  <MapPin className="h-3 w-3" />{requester.city}
                </p>
              )}
            </div>
          </div>
        </div>

        {provider && (
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Professional</p>
            <div className="flex items-center gap-3">
              <PartyAvatar name={providerName} initial={providerName.charAt(0).toUpperCase()} avatarUrl={provider?.avatar_url} />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{providerName}</p>
                <p className="text-xs text-muted-foreground capitalize">{ROLE_LABELS[provider?.role as UserRole] ?? provider?.role}</p>
                {provider?.city && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                    <MapPin className="h-3 w-3" />{provider.city}
                  </p>
                )}
                {provider?.slug && (
                  <Link href={`/professionals/${provider.role}/${provider.slug}`} className="text-xs text-primary hover:underline">
                    View profile
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Request Details</h2>
        <p className="text-sm leading-relaxed whitespace-pre-line">{req.description}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {(req.budget_min || req.budget_max) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4 shrink-0" />
              <span>
                {req.budget_min ? formatXAFShort(req.budget_min) : '?'}
                {' – '}
                {req.budget_max ? formatXAFShort(req.budget_max) : '?'}
              </span>
            </div>
          )}
          {req.preferred_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{req.preferred_date}</span>
            </div>
          )}
          {req.contact_phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{req.contact_phone}</span>
            </div>
          )}
        </div>
        {req.notes && (
          <div className="rounded-lg border border-muted bg-muted/40 px-4 py-3 text-sm">
            <span className="font-medium">Note: </span>
            {req.notes}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {isProvider && req.status === 'pending' && (
          <div className="flex gap-3">
            <form action={async () => {
              'use server'
              await acceptServiceRequest(id)
            }} className="flex-1">
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                Accept Request
              </Button>
            </form>
            <form action={async () => {
              'use server'
              await rejectServiceRequest(id, { notes: null })
            }} className="flex-1">
              <Button type="submit" variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                Decline
              </Button>
            </form>
          </div>
        )}

        {isProvider && req.status === 'accepted' && (
          <form action={async () => {
            'use server'
            await markRequestInProgress(id)
          }}>
            <Button type="submit" className="w-full">Mark as In Progress</Button>
          </form>
        )}

        {isProvider && req.status === 'in_progress' && (
          <form action={async () => {
            'use server'
            await markRequestCompleted(id)
          }}>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              Mark as Completed
            </Button>
          </form>
        )}

        {isRequester && req.status === 'pending' && (
          <form action={async () => {
            'use server'
            await cancelServiceRequest(id)
          }}>
            <Button type="submit" variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
              Cancel Request
            </Button>
          </form>
        )}

        {isRequester && req.status === 'accepted' && !req.escrow_id && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Protect your payment</p>
              <p className="text-xs text-emerald-700 mt-0.5">Start an escrow to hold funds until the work is complete.</p>
            </div>
            <LinkButton
              href={`/account/escrow?new=1&ref=service_request&refId=${id}&payeeId=${req.provider_id}`}
              size="sm"
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Start Escrow
            </LinkButton>
          </div>
        )}

        {req.escrow_id && (
          <LinkButton variant="outline" href={`/account/escrow/${req.escrow_id}`} className="w-full">
            View Escrow
          </LinkButton>
        )}

        {showMessages && conversationId && (
          <LinkButton variant="outline" href={`/messages/${conversationId}`} className="w-full">
            <MessageSquare className="h-4 w-4 mr-2" />
            {isRequester ? `Message ${providerName}` : `Message ${requesterName}`}
          </LinkButton>
        )}

        {isRequester && req.status === 'completed' && !hasReview && (
          <LinkButton href={`/requests/${id}/review`} className="w-full" variant="outline">
            Leave a Review
          </LinkButton>
        )}
        {isRequester && req.status === 'completed' && hasReview && (
          <p className="text-center text-sm text-muted-foreground">You have already reviewed this request.</p>
        )}
      </div>
    </div>
  )
}

function PartyAvatar({
  name, initial, avatarUrl,
}: {
  name: string; initial: string; avatarUrl: string | null
}) {
  return (
    <div className="relative h-10 w-10 rounded-full bg-muted shrink-0 overflow-hidden flex items-center justify-center font-semibold text-sm">
      {avatarUrl ? (
        <Image src={avatarUrl} alt={name} fill sizes="40px" className="object-cover" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  )
}
