import { cn } from '@/lib/utils/cn'
import { getInitial } from '@/lib/utils/format'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-base',
}

// Shared avatar primitive: shows the uploaded image when present, otherwise
// falls back to the user's initial on a tinted circle (never a generic icon).
export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size]

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? ''}
        className={cn('rounded-full object-cover border shrink-0', sizeClass, className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0',
        sizeClass,
        className
      )}
    >
      {getInitial(name)}
    </div>
  )
}
