import { Shield, CreditCard, CheckCircle2, AlertTriangle, Clock, User } from 'lucide-react'
import { formatRelative } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { EscrowEventRow } from '@/types/payment'

interface EscrowTimelineProps {
  events: EscrowEventRow[]
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  created:              Shield,
  funded:               CreditCard,
  released:             CheckCircle2,
  disputed:             AlertTriangle,
  dispute_resolved:     CheckCircle2,
  milestone_completed:  Clock,
  milestone_approved:   CheckCircle2,
  auto_released:        Clock,
}

const EVENT_COLORS: Record<string, string> = {
  created:              'text-blue-600 bg-blue-100',
  funded:               'text-emerald-600 bg-emerald-100',
  released:             'text-emerald-600 bg-emerald-100',
  disputed:             'text-destructive bg-red-100',
  dispute_resolved:     'text-purple-600 bg-purple-100',
  milestone_completed:  'text-amber-600 bg-amber-100',
  milestone_approved:   'text-emerald-600 bg-emerald-100',
  auto_released:        'text-blue-600 bg-blue-100',
}

export function EscrowTimeline({ events }: EscrowTimelineProps) {
  const sorted = [...events].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <div className="space-y-0">
      {sorted.map((event, i) => {
        const Icon    = EVENT_ICONS[event.event_type] ?? Shield
        const colors  = EVENT_COLORS[event.event_type] ?? 'text-muted-foreground bg-muted'
        const isLast  = i === sorted.length - 1

        return (
          <div key={event.id} className="flex gap-4">
            {/* Line + icon */}
            <div className="flex flex-col items-center">
              <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', colors)}>
                <Icon className="h-4 w-4" />
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-border my-1" />}
            </div>

            {/* Content */}
            <div className={cn('pb-4', isLast && 'pb-0')}>
              <p className="text-sm font-medium capitalize">
                {event.event_type.replace(/_/g, ' ')}
              </p>
              {event.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{formatRelative(event.created_at)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
