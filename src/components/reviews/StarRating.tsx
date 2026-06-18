'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  readOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<StarRatingProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
}

export function StarRating({ value, onChange, readOnly = false, size = 'md', className }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const interactive = !readOnly && !!onChange
  const display = hovered ?? value

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : undefined}
      aria-label={interactive ? 'Rating' : `Rated ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(null)}
          className={cn(
            'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            interactive ? 'cursor-pointer' : 'cursor-default'
          )}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <Star
            className={cn(
              SIZE_CLASSES[size],
              star <= display ? 'fill-amber-400 text-amber-400' : 'fill-none text-muted-foreground'
            )}
          />
        </button>
      ))}
    </div>
  )
}
