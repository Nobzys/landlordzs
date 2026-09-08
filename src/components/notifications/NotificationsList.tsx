'use client'

import { useState, useTransition } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/notifications/useNotifications'
import { markAllNotificationsRead } from '@/lib/actions/notifications'
import { NotificationItem } from './NotificationItem'
import { Button } from '@/components/ui/button'

type Filter = 'all' | 'unread'

export function NotificationsList() {
  const { notifications, unreadCount, isLoading } = useNotifications()
  const [filter, setFilter] = useState<Filter>('all')
  const [isPending, startTransition] = useTransition()

  const displayed = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications

  function handleMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border p-0.5 gap-0.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === 'unread'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAll}
            disabled={isPending}
            className="ml-auto text-xs"
          >
            Mark all as read
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            Loading notifications…
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          displayed.map(n => (
            <NotificationItem key={n.id} notification={n} />
          ))
        )}
      </div>
    </div>
  )
}
