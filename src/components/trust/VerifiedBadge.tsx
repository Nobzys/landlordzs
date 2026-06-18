import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

interface VerifiedBadgeProps {
  verified: boolean
  className?: string
}

// Single shared verification badge. Renders only when `verified` is true —
// badges must never be shown speculatively. Replaces the ad-hoc inline
// ShieldCheck/Badge combinations previously copy-pasted across multiple
// dashboard/property components.
export function VerifiedBadge({ verified, className }: VerifiedBadgeProps) {
  if (!verified) return null

  return (
    <Badge
      variant="secondary"
      className={cn('gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100', className)}
    >
      <ShieldCheck className="h-3 w-3" />
      Verified
    </Badge>
  )
}
