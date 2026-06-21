import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface PropertyImagePlaceholderProps {
  className?: string
}

// Branded fallback shown wherever a property/portfolio image is missing —
// keeps a consistent aspect ratio and look instead of a bare "No image" text.
export function PropertyImagePlaceholder({ className }: PropertyImagePlaceholderProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-muted',
        className
      )}
    >
      <Building2 className="h-10 w-10 text-primary/30" />
    </div>
  )
}
