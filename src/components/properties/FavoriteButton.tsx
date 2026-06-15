'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFavoriteIds, useToggleFavorite } from '@/hooks/properties/useFavorites'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils/cn'

interface FavoriteButtonProps {
  propertyId: string
  className?: string
  size?: 'sm' | 'default'
}

export function FavoriteButton({ propertyId, className, size = 'default' }: FavoriteButtonProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // All hooks must be called unconditionally before any early return.
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  const { data: favoriteIds } = useFavoriteIds()
  const { mutate, isPending } = useToggleFavorite(propertyId)

  const buttonClassName = cn(
    'rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm',
    size === 'sm' && 'h-8 w-8',
    className
  )
  const heartClassName = cn(
    'transition-colors',
    size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
  )

  // Before mount, render a deterministic placeholder.
  // Server and client first-render are identical: a static, disabled button.
  // useAuthStore starts with user=null on the server so isAuthenticated=false,
  // which disables the React Query fetch; the client may already have cached
  // favorites from a prior navigation, producing isFavorited=true.
  // That discrepancy causes the aria-label and Heart className to differ,
  // triggering the hydration mismatch at button.tsx:44.
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={buttonClassName}
        disabled
        aria-label="Save to favorites"
      >
        <Heart className={cn(heartClassName, 'text-gray-600')} />
      </Button>
    )
  }

  const isFavorited = favoriteIds?.has(propertyId) ?? false

  return (
    <Button
      variant="ghost"
      size="icon"
      className={buttonClassName}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!isAuthenticated) {
          window.location.href = '/login'
          return
        }
        mutate()
      }}
      disabled={isPending}
      aria-label={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
    >
      <Heart
        className={cn(
          heartClassName,
          isFavorited ? 'fill-rose-500 text-rose-500' : 'text-gray-600',
        )}
      />
    </Button>
  )
}
