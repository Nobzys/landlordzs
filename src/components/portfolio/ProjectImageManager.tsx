'use client'

import { useState, useTransition, useRef } from 'react'
import Image from 'next/image'
import { Trash2, ArrowUp, ArrowDown, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addProjectImage, deleteProjectImage, reorderProjectImages } from '@/lib/actions/portfolio'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'

export interface ManagedImage {
  id:           string
  signedUrl:    string
  storagePath:  string
  display_order: number
}

interface ProjectImageManagerProps {
  projectId:     string
  initialImages: ManagedImage[]
}

export function ProjectImageManager({ projectId, initialImages }: ProjectImageManagerProps) {
  const [images, setImages]       = useState<ManagedImage[]>(
    [...initialImages].sort((a, b) => a.display_order - b.display_order)
  )
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [isPending, start]        = useTransition()
  const fileInputRef              = useRef<HTMLInputElement>(null)

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setUploading(true)

    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bucket', STORAGE_BUCKETS.PROJECT_IMAGES)
      fd.append('resource_id', projectId)

      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json() as { url?: string; path?: string; error?: string }

      if (!res.ok || json.error || !json.path) {
        setError(json.error ?? 'Upload failed. Please try again.')
        setUploading(false)
        return
      }

      const nextOrder = images.length > 0
        ? Math.max(...images.map(i => i.display_order)) + 1
        : 0

      const addRes = await addProjectImage(projectId, json.path, nextOrder)
      if (addRes.error) {
        setError(addRes.error)
        setUploading(false)
        return
      }

      if (addRes.data?.id && json.url) {
        setImages(prev => [
          ...prev,
          {
            id:           addRes.data!.id,
            signedUrl:    json.url!,
            storagePath:  json.path!,
            display_order: nextOrder,
          },
        ])
      }
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleDelete(img: ManagedImage) {
    start(async () => {
      setError(null)
      const res = await deleteProjectImage(img.id, img.storagePath)
      if (res.error) {
        setError(res.error)
        return
      }
      setImages(prev => prev.filter(i => i.id !== img.id))
    })
  }

  function moveImage(index: number, direction: -1 | 1) {
    const next = index + direction
    if (next < 0 || next >= images.length) return

    const updated = [...images]
    ;[updated[index], updated[next]] = [updated[next], updated[index]]

    // Re-assign sequential display_order values
    const reordered = updated.map((img, i) => ({ ...img, display_order: i }))
    setImages(reordered)

    start(async () => {
      const res = await reorderProjectImages(
        reordered.map(i => ({ id: i.id, display_order: i.display_order }))
      )
      if (res.error) setError(res.error)
    })
  }

  const busy = uploading || isPending

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="rounded-xl border-2 border-dashed p-6 text-center space-y-3">
        <Upload className="h-8 w-8 mx-auto text-muted-foreground/50" />
        <div>
          <p className="text-sm font-medium">Upload project images</p>
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP — up to 25 MB each</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          id="img-upload"
          onChange={(e) => handleUpload(e.target.files)}
          disabled={busy}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading…
            </>
          ) : 'Choose Images'}
        </Button>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {images.length} image{images.length !== 1 ? 's' : ''} — first image is the cover
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img, index) => (
              <div key={img.id} className="relative group rounded-lg overflow-hidden border bg-muted aspect-video">
                <Image
                  src={img.signedUrl}
                  alt={`Project image ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
                  unoptimized
                />
                {/* Order badge */}
                {index === 0 && (
                  <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
                    Cover
                  </span>
                )}
                {/* Controls */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => moveImage(index, -1)}
                    disabled={index === 0 || busy}
                    className="p-1.5 rounded bg-white/20 hover:bg-white/40 disabled:opacity-30 transition-colors"
                    title="Move left"
                  >
                    <ArrowUp className="h-3.5 w-3.5 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, 1)}
                    disabled={index === images.length - 1 || busy}
                    className="p-1.5 rounded bg-white/20 hover:bg-white/40 disabled:opacity-30 transition-colors"
                    title="Move right"
                  >
                    <ArrowDown className="h-3.5 w-3.5 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(img)}
                    disabled={busy}
                    className="p-1.5 rounded bg-red-500/70 hover:bg-red-500/90 disabled:opacity-30 transition-colors"
                    title="Delete image"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
