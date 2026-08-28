'use client'

import Link from 'next/link'
import { MapPin, Calendar, DollarSign, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CAMEROON_CITIES } from '@/lib/utils/constants'

export interface ServiceRequestSummary {
  id:           string
  title:        string
  description:  string
  city:         string | null
  budget_min:   number | null
  budget_max:   number | null
  deadline:     string | null
  status:       string
  created_at:   string
  category:     { name: string } | null
  quotation_count?: number
}

const STATUS_COLORS: Record<string, string> = {
  open:        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  quoted:      'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  accepted:    'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  in_progress: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  completed:   'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  cancelled:   'bg-red-500/10 text-red-600 dark:text-red-400',
  disputed:    'bg-orange-500/10 text-orange-700 dark:text-orange-400',
}

const STATUS_LABELS: Record<string, string> = {
  open:        'Open',
  quoted:      'Quoted',
  accepted:    'Accepted',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
  disputed:    'Disputed',
}

function formatXAF(amount: number) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency', currency: 'XAF', maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CM', { year: 'numeric', month: 'short', day: 'numeric' })
}

function cityLabel(value: string | null) {
  if (!value) return null
  return CAMEROON_CITIES.find(c => c.value === value)?.label ?? value
}

interface ServiceRequestCardProps {
  request: ServiceRequestSummary
  href?: string
}

export function ServiceRequestCard({ request, href }: ServiceRequestCardProps) {
  const link = href ?? `/services/${request.id}`
  const statusColor = STATUS_COLORS[request.status] ?? STATUS_COLORS.open
  const statusLabel = STATUS_LABELS[request.status] ?? request.status

  return (
    <Link href={link} className="block group">
      <div className="rounded-xl border bg-card hover:border-primary/40 transition-colors p-5 flex flex-col gap-3 h-full">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {request.category && (
              <p className="text-xs text-muted-foreground mb-1">{request.category.name}</p>
            )}
            <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {request.title}
            </h3>
          </div>
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {request.description}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground mt-auto pt-2 border-t">
          {cityLabel(request.city) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {cityLabel(request.city)}
            </span>
          )}

          {(request.budget_min || request.budget_max) && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {request.budget_min && request.budget_max
                ? `${formatXAF(request.budget_min)} – ${formatXAF(request.budget_max)}`
                : request.budget_min
                  ? `From ${formatXAF(request.budget_min)}`
                  : `Up to ${formatXAF(request.budget_max!)}`}
            </span>
          )}

          {request.deadline && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due {formatDate(request.deadline)}
            </span>
          )}

          <span className="flex items-center gap-1 ml-auto">
            <Clock className="h-3 w-3" />
            {formatDate(request.created_at)}
          </span>
        </div>

        {typeof request.quotation_count === 'number' && (
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {request.quotation_count} quote{request.quotation_count !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </div>
    </Link>
  )
}
