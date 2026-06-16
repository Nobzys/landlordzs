import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell, CheckCheck, ExternalLink, ChevronLeft } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { getMyNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/actions/notifications'
import type { NotificationRow } from '@/lib/actions/notifications'
import { Button } from '@/components/ui/button'
import { formatRelative } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Notifications — LANDLORDZS' }

const TYPE_LABELS: Record<string, string> = {
  message:         'Message',
  enquiry:         'Enquiry',
  offer:           'Offer',
  booking:         'Booking',
  payment:         'Payment',
  review:          'Review',
  property_update: 'Property',
  order_update:    'Order',
  service_update:  'Service',
  job_update:      'Job',
  system:          'System',
  promotional:     'Promo',
  verification:    'Verification',
  subscription:    'Billing',
}

const TYPE_COLORS: Record<string, string> = {
  payment:         'bg-emerald-100 text-emerald-700',
  subscription:    'bg-blue-100 text-blue-700',
  service_update:  'bg-violet-100 text-violet-700',
  property_update: 'bg-amber-100 text-amber-700',
  verification:    'bg-cyan-100 text-cyan-700',
  system:          'bg-gray-100 text-gray-600',
  message:         'bg-pink-100 text-pink-700',
}

function typeColor(type: string) {
  return TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600'
}

const FILTER_TYPES = [
  'all', 'service_update', 'property_update', 'payment', 'subscription',
  'system', 'message', 'verification',
]

interface SearchParams { type?: string; cursor?: string }

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  const params      = await searchParams
  const typeFilter  = params.type && FILTER_TYPES.includes(params.type) && params.type !== 'all'
    ? params.type
    : undefined

  const result = await getMyNotifications({ type: typeFilter, cursor: params.cursor, limit: 25 })
  const notifications: NotificationRow[] = result.data?.notifications ?? []
  const unreadCount  = result.data?.unreadCount ?? 0
  const hasMore      = result.data?.hasMore ?? false
  const nextCursor   = notifications.length > 0
    ? notifications[notifications.length - 1].created_at
    : undefined

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/account"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <form action={async () => {
            'use server'
            await markAllNotificationsRead()
          }}>
            <Button type="submit" variant="outline" size="sm" className="gap-1.5">
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          </form>
        )}
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TYPES.map((t) => {
          const active = t === 'all' ? !typeFilter : typeFilter === t
          const href   = t === 'all' ? '/account/notifications' : `/account/notifications?type=${t}`
          return (
            <Link
              key={t}
              href={href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors capitalize ${
                active ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
              }`}
            >
              {TYPE_LABELS[t] ?? t}
            </Link>
          )
        })}
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="rounded-xl border text-center py-20">
          <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">
            {typeFilter ? `No ${TYPE_LABELS[typeFilter] ?? typeFilter} notifications` : 'No notifications yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const notifId = n.id
            return (
              <div
                key={n.id}
                className={`rounded-xl border bg-card p-4 flex gap-3 transition-colors ${
                  !n.is_read ? 'border-primary/30 bg-primary/5' : ''
                }`}
              >
                {/* Unread dot */}
                <div className="mt-1 shrink-0">
                  {!n.is_read
                    ? <span className="block h-2 w-2 rounded-full bg-primary" />
                    : <span className="block h-2 w-2 rounded-full bg-transparent" />
                  }
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${typeColor(n.type)}`}>
                      {TYPE_LABELS[n.type] ?? n.type}
                    </span>
                    <p className="text-sm font-semibold leading-tight">{n.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-muted-foreground">{formatRelative(n.created_at)}</span>
                    {n.action_url && (
                      <Link
                        href={n.action_url}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Mark read */}
                {!n.is_read && (
                  <form action={async () => {
                    'use server'
                    void markNotificationRead(notifId)
                  }}>
                    <button
                      type="submit"
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                      title="Mark as read"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {hasMore && nextCursor && (
        <div className="text-center">
          <Button asChild variant="outline">
            <Link
              href={
                typeFilter
                  ? `/account/notifications?type=${typeFilter}&cursor=${encodeURIComponent(nextCursor)}`
                  : `/account/notifications?cursor=${encodeURIComponent(nextCursor)}`
              }
            >
              Load more
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
