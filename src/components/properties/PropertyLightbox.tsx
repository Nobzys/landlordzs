'use client'

import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { PropertyImageRow } from '@/types/database'

interface PropertyLightboxProps {
  images: PropertyImageRow[]
  title: string
  index: number
  onClose: () => void
  onNavigate: (dir: 1 | -1) => void
}

export function PropertyLightbox({ images, title, index, onClose, onNavigate }: PropertyLightboxProps) {
  const current = images[index]

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 bg-black border-0">
        <div className="relative h-[80vh]">
          {current && (
            <Image
              src={current.url}
              alt={current.alt_text ?? title}
              fill
              className="object-contain"
              sizes="100vw"
            />
          )}

          <button
            className="absolute top-3 right-3 text-white bg-black/50 rounded-full p-1.5 hover:bg-black/70"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"
                onClick={() => onNavigate(-1)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"
                onClick={() => onNavigate(1)}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 rounded-full px-3 py-1">
                {index + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
