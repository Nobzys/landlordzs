'use client'

import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  MessageCircle, Home, Tag, Building2, CreditCard, Star,
  Package, Wrench, Briefcase, Settings, ShieldCheck,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { markNotificationRead } from '@/lib/actions/notifications'
import { queryKeys } from '@/lib/query/keys'
import type { Notification } from '@/lib/actions/notifications'

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  message:         MessageCircle,
  enquiry:         Home,
  offer:           Tag,
  booking:         Building2,
  payment:         CreditCard,
  review:          Star,
  property_update: Building2,
  order_update:    Package,
  service_update:  Wrench,
  job_update:      Briefcase,
  system:          Settings,
  promotional:     Tag,
  verification:    ShieldCheck,
}

interface NotificationItemProps {
  notification: Notification
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const Icon = TYPE_ICONS[notification.type] ?? Settings

  async function handleClick() {
    if (!notification.is_read) {
      await markNotificationRead(notification.id)
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    }
    if (notification.action_url) {
      router.push(notification.action_url)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent border-b last:border-b-0',
        !notification.is_read && 'bg-primary/5',
      )}
    >
      <div className={cn(
        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        notification.is_read ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', !notification.is_read && 'font-semibold')}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.body}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notification.is_read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  )
}
