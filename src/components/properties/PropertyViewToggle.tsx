'use client'

import dynamic from 'next/dynamic'
import { LayoutGrid, Map } from 'lucide-react'
import { useState, useCallback } from 'react'
import { useProperties } from '@/hooks/properties/useProperties'
import { useFilterStore } from '@/stores/filterStore'
import { PropertyGrid } from './PropertyGrid'
import { Button } from '@/components/ui/button'

const PropertyMap = dynamic(
  () => import('@/components/map/PropertyMap').then((m) => m.PropertyMap),
  { ssr: false, loading: () => <div className="h-[520px] rounded-xl border bg-muted animate-pulse" /> },
)

export function PropertyViewToggle() {
  const [view, setView] = useState<'list' | 'map'>('list')
  const filters = useFilterStore((s) => s.filters)

  // For map mode we fetch all visible properties (up to 100) with coords
  const { data: pages, isFetching } = useProperties(filters)

  const allProperties = view === 'map'
    ? (pages?.pages ?? []).flatMap((p) => p.items)
    : []

  const selectedIdRef = useCallback((id: string) => {
    window.open(`/properties/${id}`, '_blank')
  }, [])

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant={view === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('list')}
          className="gap-1.5"
        >
          <LayoutGrid className="h-4 w-4" />
          List
        </Button>
        <Button
          variant={view === 'map' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('map')}
          className="gap-1.5"
        >
          <Map className="h-4 w-4" />
          Map
        </Button>
      </div>

      {view === 'list' && <PropertyGrid />}

      {view === 'map' && (
        <>
          {isFetching && allProperties.length === 0 ? (
            <div className="h-[520px] rounded-xl border bg-muted animate-pulse" />
          ) : (
            <PropertyMap
              properties={allProperties.map((p) => ({
                id: p.id,
                title: p.title,
                price: (p as any).price ?? null,
                city: (p as any).city ?? null,
                latitude: (p as any).latitude ?? null,
                longitude: (p as any).longitude ?? null,
                listing_type: (p as any).listing_type ?? null,
                property_images: (p as any).property_images ?? [],
              }))}
              onSelect={selectedIdRef}
            />
          )}
          <p className="text-xs text-center text-muted-foreground">
            Showing {allProperties.length} properties on map · Locations are approximate
          </p>
        </>
      )}
    </div>
  )
}
