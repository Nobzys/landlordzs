'use client'

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
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  const { data: favoriteIds } = useFavoriteIds()
  const { mutate, isPending } = useToggleFavorite(propertyId)

  const isFavorited = favoriteIds?.has(propertyId) ?? false

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm',
        size === 'sm' && 'h-8 w-8',
        className
      )}
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
          'transition-colors',
          size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
          isFavorited ? 'fill-rose-500 text-rose-500' : 'text-gray-600'
        )}
      />
    </Button>
  )
}
