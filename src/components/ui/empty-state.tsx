import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  ctaLabel?: string
  ctaHref?: string
  onCtaClick?: () => void
  className?: string
}

export function EmptyState({ icon: Icon, title, description, ctaLabel, ctaHref, onCtaClick, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center rounded-xl border py-16 px-4', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="font-medium mb-1">{title}</p>
      {description && <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>}
      {ctaLabel && ctaHref && (
        <Button asChild size="sm">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      )}
      {ctaLabel && onCtaClick && (
        <Button size="sm" onClick={onCtaClick}>{ctaLabel}</Button>
      )}
    </div>
  )
}
