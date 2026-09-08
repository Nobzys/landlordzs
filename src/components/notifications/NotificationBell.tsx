'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/notifications/useNotifications'

export function NotificationBell() {
  const { unreadCount } = useNotifications()

  return (
    <Link
      href="/account/notifications"
      className="relative flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-4 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
