'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { Upload, X, Star, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { uploadPropertyImage } from '@/lib/supabase/storage'
import { addPropertyImage, removePropertyImage } from '@/lib/actions/properties'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'

interface UploadedImage {
  id: string
  url: string
  path: string
  is_primary: boolean
}

interface ImageUploadProps {
  propertyId: string
  userId: string
  initialImages?: UploadedImage[]
  maxImages?: number
}

export function ImageUpload({
  propertyId,
  userId,
  initialImages = [],
  maxImages = 20,
}: ImageUploadProps) {
  const [images, setImages] = useState<UploadedImage[]>(initialImages)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const remaining = maxImages - images.length
      const toUpload  = acceptedFiles.slice(0, remaining)
      if (toUpload.length === 0) {
        toast.error(`Maximum ${maxImages} images allowed`)
        return
      }

      setUploading(true)
      setProgress(0)

      for (let i = 0; i < toUpload.length; i++) {
        try {
          const file   = toUpload[i]
          const result = await uploadPropertyImage(propertyId, file, userId)
          const isPrimary = images.length === 0 && i === 0

          const saved = await addPropertyImage(propertyId, result.url, result.path, isPrimary)
          if (saved.error) throw new Error(saved.error)

          setImages(prev => [...prev, {
            id: saved.data!.id,
            url: result.url,
            path: result.path,
            is_primary: isPrimary,
          }])
        } catch (err) {
          toast.error(`Failed to upload image ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
        setProgress(Math.round(((i + 1) / toUpload.length) * 100))
      }

      setUploading(false)
    },
    [images.length, maxImages, propertyId, userId]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [], 'image/avif': [] },
    maxSize: 10 * 1024 * 1024,
    disabled: uploading || images.length >= maxImages,
  })

  const handleRemove = async (img: UploadedImage) => {
    const result = await removePropertyImage(img.id, img.path)
    if (result.error) { toast.error(result.error); return }
    setImages(prev => prev.filter(i => i.id !== img.id))
  }

  const handleSetPrimary = (id: string) => {
    setImages(prev => prev.map(i => ({ ...i, is_primary: i.id === id })))
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-muted-foreground/30 hover:border-blue-400',
          (uploading || images.length >= maxImages) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isDragActive ? 'Drop images here' : 'Drag & drop images, or click to select'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          JPEG, PNG, WebP, AVIF — max 10 MB each. {images.length}/{maxImages} uploaded.
        </p>
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading…
          </div>
          <Progress value={progress} />
        </div>
      )}

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {images.map(img => (
            <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border">
              <Image src={img.url} alt="" fill className="object-cover" sizes="150px" />

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetPrimary(img.id)}
                  className={cn(
                    'rounded-full p-1.5 text-white transition-colors',
                    img.is_primary ? 'bg-amber-500' : 'bg-white/30 hover:bg-amber-500'
                  )}
                  title="Set as primary"
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(img)}
                  className="rounded-full p-1.5 bg-white/30 hover:bg-red-500 text-white transition-colors"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {img.is_primary && (
                <div className="absolute bottom-0 inset-x-0 text-center text-xs text-white bg-amber-500/90 py-0.5">
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
