'use client'

import { useRef, useState, useTransition } from 'react'
import { Upload, Star, Trash2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addPortfolioImage, deletePortfolioImage, setCoverImage } from '@/lib/actions/portfolio'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

export interface PortfolioImageItem {
  id: string
  url: string
  caption: string | null
  is_cover: boolean
}

interface PortfolioImageManagerProps {
  userId: string
  portfolioId: string
  images: PortfolioImageItem[]
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 8 * 1024 * 1024

export function PortfolioImageManager({ userId, portfolioId, images: initialImages }: PortfolioImageManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState(initialImages)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, or WEBP images are accepted.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be under 8 MB.')
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        const supabase = createClient()
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `${userId}/${portfolioId}/${Date.now()}.${ext}`

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: uploadError } = await (supabase as any).storage
          .from(STORAGE_BUCKETS.PORTFOLIOS)
          .upload(path, file, { cacheControl: '3600', upsert: false })

        if (uploadError) throw new Error(uploadError.message)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: urlData } = (supabase as any).storage
          .from(STORAGE_BUCKETS.PORTFOLIOS)
          .getPublicUrl(path)

        const url = urlData.publicUrl as string
        const result = await addPortfolioImage(portfolioId, url)
        if (result?.error) throw new Error(result.error)

        const id = (result as { data?: { id: string } }).data?.id
        if (id) setImages((prev) => [...prev, { id, url, caption: null, is_cover: prev.length === 0 }])
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img) => (
          <div key={img.id} className="relative group rounded-lg overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.caption ?? ''} className="h-32 w-full object-cover" />
            {img.is_cover && (
              <span className="absolute top-1.5 left-1.5 rounded bg-emerald-600 text-white text-[10px] font-medium px-1.5 py-0.5">
                Cover
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              {!img.is_cover && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(async () => {
                    const res = await setCoverImage(img.id, portfolioId)
                    if (!res?.error) {
                      setImages((prev) => prev.map((i) => ({ ...i, is_cover: i.id === img.id })))
                    }
                  })}
                  className="text-white hover:text-amber-300"
                  aria-label="Set as cover"
                >
                  <Star className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(async () => {
                  const res = await deletePortfolioImage(img.id, portfolioId)
                  if (!res?.error) setImages((prev) => prev.filter((i) => i.id !== img.id))
                })}
                className="text-white hover:text-red-400"
                aria-label="Delete image"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className={cn(
            'h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1.5 text-muted-foreground',
            'hover:border-muted-foreground/40 disabled:opacity-60'
          )}
        >
          <Upload className="h-5 w-5" />
          <span className="text-xs">{isPending ? 'Uploading…' : 'Add photo'}</span>
        </button>
      </div>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        disabled={isPending}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
