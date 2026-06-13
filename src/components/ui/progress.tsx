'use client'

import { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value))}%)` }}
      />
    </div>
  )
)
Progress.displayName = 'Progress'
