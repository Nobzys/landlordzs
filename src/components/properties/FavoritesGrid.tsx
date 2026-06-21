'use client'

import { Heart } from 'lucide-react'
import { PropertyCard } from './PropertyCard'
import { PropertyCardSkeleton } from './PropertyCardSkeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { useFavorites } from '@/hooks/properties/useFavorites'

export function FavoritesGrid() {
  const { data, isLoading, isError } = useFavorites()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => <PropertyCardSkeleton key={i} />)}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Failed to load saved properties
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="You haven't saved any properties yet."
        ctaLabel="Browse properties"
        ctaHref="/properties"
      />
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {data.map(p => <PropertyCard key={p.id} property={p} />)}
    </div>
  )
}
