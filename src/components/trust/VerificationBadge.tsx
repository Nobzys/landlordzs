import { BadgeCheck, Clock, AlertTriangle } from 'lucide-react'

interface VerificationBadgeProps {
  status: string | null | undefined
  size?: 'sm' | 'md'
}

export function VerificationBadge({ status, size = 'md' }: VerificationBadgeProps) {
  const iconCls = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  const baseCls = `inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
    size === 'sm' ? 'text-[10px]' : 'text-xs'
  }`

  if (status === 'approved') {
    return (
      <span className={`${baseCls} bg-emerald-100 text-emerald-700`}>
        <BadgeCheck className={iconCls} />
        Verified
      </span>
    )
  }

  if (status === 'under_review') {
    return (
      <span className={`${baseCls} bg-blue-100 text-blue-700`}>
        <Clock className={iconCls} />
        Under Review
      </span>
    )
  }

  if (status === 'expired') {
    return (
      <span className={`${baseCls} bg-gray-100 text-gray-600`}>
        <AlertTriangle className={iconCls} />
        Expired
      </span>
    )
  }

  return null
}
