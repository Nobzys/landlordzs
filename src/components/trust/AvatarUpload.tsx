'use client'

import { useRef, useState, useTransition } from 'react'
import { Camera, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateProfileAvatar } from '@/lib/actions/profile'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import { getInitial } from '@/lib/utils/format'

interface AvatarUploadProps {
  userId: string
  currentUrl: string | null
  name: string | null
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

export function AvatarUpload({ userId, currentUrl, name }: AvatarUploadProps) {
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
        const path = `${userId}/avatar-${Date.now()}.${ext}`

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
        await updateProfileAvatar(publicUrl)
        setPreview(publicUrl)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      }
    })
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="relative h-16 w-16 rounded-full overflow-hidden border bg-muted shrink-0 group disabled:opacity-60"
        aria-label="Change profile photo"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={name ?? 'Profile photo'} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
            {getInitial(name)}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="h-5 w-5 text-white" />
        </span>
      </button>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="text-sm font-medium text-primary hover:underline disabled:opacity-60"
        >
          {isPending ? 'Uploading…' : 'Change photo'}
        </button>
        <p className="text-xs text-muted-foreground">JPG, PNG, or WEBP. Max 5 MB.</p>
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {error}
          </p>
        )}
      </div>
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
