import { STATUS_COLORS, STATUS_LABELS } from '@/types/service-request'

interface RequestStatusBadgeProps {
  status: string
  className?: string
}

export function RequestStatusBadge({ status, className = '' }: RequestStatusBadgeProps) {
  const label = STATUS_LABELS[status] ?? status
  const color = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color} ${className}`}>
      {label}
    </span>
  )
}
