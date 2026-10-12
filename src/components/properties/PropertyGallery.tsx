'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Grid2X2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import type { PropertyImageRow } from '@/types/database'

const PropertyLightbox = dynamic(
  () => import('./PropertyLightbox').then(m => ({ default: m.PropertyLightbox })),
  { ssr: false },
)

interface PropertyGalleryProps {
  images: PropertyImageRow[]
  title: string
}

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const sorted = [...images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order)

  const go = (dir: 1 | -1) => {
    setLightboxIndex(prev => {
      if (prev === null) return null
      return (prev + dir + sorted.length) % sorted.length
    })
  }

  const primary = sorted[0]
  const rest    = sorted.slice(1, 5)

  return (
    <>
      {/* Grid layout */}
      <div className={cn('grid gap-2 rounded-xl overflow-hidden', rest.length > 0 ? 'grid-cols-3 grid-rows-2 h-[420px]' : 'h-72')}>
        {/* Primary */}
        <div
          className={cn(
            'relative cursor-pointer bg-muted',
            rest.length > 0 ? 'col-span-2 row-span-2' : 'col-span-3 row-span-2'
          )}
          onClick={() => setLightboxIndex(0)}
        >
          {primary ? (
            <Image
              src={primary.url}
              alt={primary.alt_text ?? title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 66vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">No images</div>
          )}
        </div>

        {/* Thumbnails */}
        {rest.map((img, i) => (
          <div
            key={img.id}
            className="relative cursor-pointer bg-muted overflow-hidden"
            onClick={() => setLightboxIndex(i + 1)}
          >
            <Image
              src={img.url}
              alt={img.alt_text ?? `${title} ${i + 2}`}
              fill
              className="object-cover hover:scale-105 transition-transform duration-200"
              sizes="33vw"
            />
            {i === 3 && sorted.length > 5 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Button variant="secondary" size="sm" className="gap-1">
                  <Grid2X2 className="h-4 w-4" />
                  +{sorted.length - 5}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox — lazy-loaded on first open */}
      {lightboxIndex !== null && (
        <PropertyLightbox
          images={sorted}
          title={title}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={go}
        />
      )}
    </>
  )
}
