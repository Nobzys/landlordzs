'use client'

import { Heart } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PropertyCard } from './PropertyCard'
import { PropertyCardSkeleton } from './PropertyCardSkeleton'
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
      <div className="text-center py-16 text-muted-foreground">
        <Heart className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p className="font-medium mb-1">No saved properties</p>
        <p className="text-sm mb-4">Browse properties and tap the heart icon to save them here.</p>
        <Button asChild variant="outline">
          <Link href="/properties">Browse Properties</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {data.map(p => <PropertyCard key={p.id} property={p} />)}
    </div>
  )
}
