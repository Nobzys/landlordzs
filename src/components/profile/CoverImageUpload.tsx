'use client'

import { useRef, useState, useTransition } from 'react'
import { Camera, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateProfileCover } from '@/lib/actions/profile'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'

interface CoverImageUploadProps {
  userId: string
  currentUrl: string | null
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

// Same bucket as AvatarUpload (user-avatars is the only available storage
// bucket for this feature) — distinguished by filename prefix only.
export function CoverImageUpload({ userId, currentUrl }: CoverImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, or WEBP images are accepted.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be under 5 MB.')
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        const supabase = createClient()
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `${userId}/cover-${Date.now()}.${ext}`

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: uploadError } = await (supabase as any).storage
          .from(STORAGE_BUCKETS.USER_AVATARS)
          .upload(path, file, { cacheControl: '3600', upsert: true })

        if (uploadError) throw new Error(uploadError.message)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: urlData } = (supabase as any).storage
          .from(STORAGE_BUCKETS.USER_AVATARS)
          .getPublicUrl(path)

        const publicUrl = urlData.publicUrl as string
        await updateProfileCover(publicUrl)
        setPreview(publicUrl)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      }
    })
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="relative h-28 w-full rounded-xl overflow-hidden border bg-muted group disabled:opacity-60"
        aria-label="Change cover image"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Cover" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="h-5 w-5 text-white" />
        </span>
      </button>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="text-sm font-medium text-primary hover:underline disabled:opacity-60"
        >
          {isPending ? 'Uploading…' : 'Change cover image'}
        </button>
        <p className="text-xs text-muted-foreground">JPG, PNG, or WEBP. Max 5 MB.</p>
      </div>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
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
