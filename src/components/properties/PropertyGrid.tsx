'use client'

import { useRef, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PropertyCard } from './PropertyCard'
import { PropertyCardSkeleton } from './PropertyCardSkeleton'
import { useProperties } from '@/hooks/properties/useProperties'
import { useFilterStore } from '@/stores/filterStore'

export function PropertyGrid() {
  const filters = useFilterStore(s => s.filters)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const {
    data,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isError,
  } = useProperties(filters)

  // Infinite scroll intersection observer
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const allProperties = data?.pages.flatMap(p => p.items) ?? []
  const totalCount    = data?.pages[0]?.total ?? 0

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <PropertyCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="mb-3">Failed to load properties</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Try again</Button>
      </div>
    )
  }

  if (allProperties.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium mb-1">No properties found</p>
        <p className="text-sm">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {totalCount.toLocaleString()} propert{totalCount === 1 ? 'y' : 'ies'} found
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {allProperties.map(property => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      <div ref={loadMoreRef} className="flex justify-center pt-4">
        {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        {!hasNextPage && allProperties.length > 0 && (
          <p className="text-sm text-muted-foreground">All properties loaded</p>
        )}
      </div>
    </div>
  )
}
