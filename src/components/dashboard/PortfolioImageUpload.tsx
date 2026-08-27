'use client'

import { useState, useRef, useTransition } from 'react'
import { ImagePlus, Trash2, Loader2, Star, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { uploadPortfolioImage } from '@/lib/supabase/storage'
import { addPortfolioImage, removePortfolioImage } from '@/lib/actions/profile'

const MAX_IMAGES = 10

export type PortfolioImage = {
  id:         string
  url:        string
  is_cover:   boolean
  sort_order: number
}

interface Props {
  portfolioId: string
  userId:      string
  initialImages: PortfolioImage[]
}

export function PortfolioImageUpload({ portfolioId, userId, initialImages }: Props) {
  const [images, setImages]     = useState<PortfolioImage[]>(initialImages)
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const canAdd = images.length < MAX_IMAGES

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const toUpload = Array.from(files).slice(0, MAX_IMAGES - images.length)
    if (toUpload.length === 0) return

    setError(null)
    setUploading(true)
    try {
      for (const file of toUpload) {
        const { url } = await uploadPortfolioImage(portfolioId, file, userId)
        const isCover  = images.length === 0
        const sortOrder = images.length
        const res = await addPortfolioImage(portfolioId, url, isCover, sortOrder)
        if (res.error) { setError(res.error); break }
        if (res.data) {
          setImages(prev => [
            ...prev,
            { id: res.data!.id, url, is_cover: isCover, sort_order: sortOrder },
          ])
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleRemove(image: PortfolioImage) {
    startTransition(async () => {
      setError(null)
      const res = await removePortfolioImage(image.id, portfolioId)
      if (res.error) { setError(res.error); return }
      setImages(prev => prev.filter(img => img.id !== image.id))
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Project Photos</p>
        <span className="text-xs text-muted-foreground">{images.length} / {MAX_IMAGES}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {images.map((image, idx) => (
          <div
            key={image.id}
            className="group relative aspect-square rounded-lg border overflow-hidden bg-muted"
          >
            <Image
              src={image.url}
              alt={`Portfolio photo ${idx + 1}`}
              fill
              className="object-cover"
              sizes="120px"
            />
            {image.is_cover && (
              <span className="absolute top-1 left-1 flex items-center gap-0.5 text-[10px] bg-primary text-primary-foreground rounded px-1 leading-tight">
                <Star className="h-2.5 w-2.5 fill-current" /> Cover
              </span>
            )}
            <button
              type="button"
              onClick={() => handleRemove(image)}
              disabled={isPending || uploading}
              className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed"
              aria-label="Remove photo"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || isPending}
            className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <ImagePlus className="h-5 w-5" />
            }
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={e => handleFiles(e.target.files)}
      />

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        JPEG, PNG, or WebP · max 25 MB each · up to {MAX_IMAGES} photos · first photo becomes the cover
      </p>
    </div>
  )
}
