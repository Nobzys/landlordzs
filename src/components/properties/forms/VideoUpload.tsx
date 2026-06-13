'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Video, X, Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { uploadPropertyVideo } from '@/lib/supabase/storage'
import { addPropertyVideo } from '@/lib/actions/properties'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'

interface UploadedVideo {
  id: string
  url: string
  title: string | null
}

interface VideoUploadProps {
  propertyId: string
  userId: string
  initialVideos?: UploadedVideo[]
  maxVideos?: number
}

export function VideoUpload({
  propertyId,
  userId,
  initialVideos = [],
  maxVideos = 3,
}: VideoUploadProps) {
  const [videos, setVideos]     = useState<UploadedVideo[]>(initialVideos)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [titleInput, setTitleInput] = useState('')

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return
      if (videos.length >= maxVideos) {
        toast.error(`Maximum ${maxVideos} videos allowed`)
        return
      }

      setUploading(true)
      setProgress(20)

      try {
        const result = await uploadPropertyVideo(propertyId, file, userId)
        setProgress(70)
        const saved = await addPropertyVideo(propertyId, result.url, titleInput || undefined)
        if (saved.error) throw new Error(saved.error)
        setVideos(prev => [...prev, { id: saved.data!.id, url: result.url, title: titleInput || null }])
        setTitleInput('')
        toast.success('Video uploaded')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed')
      }

      setProgress(100)
      setUploading(false)
    },
    [videos.length, maxVideos, propertyId, userId, titleInput]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/mp4': [], 'video/webm': [], 'video/quicktime': [] },
    maxSize: 100 * 1024 * 1024,
    multiple: false,
    disabled: uploading || videos.length >= maxVideos,
  })

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Video Title (optional)</Label>
        <Input
          placeholder="e.g. Property Tour"
          value={titleInput}
          onChange={e => setTitleInput(e.target.value)}
          disabled={uploading}
        />
      </div>

      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-muted-foreground/30 hover:border-blue-400',
          (uploading || videos.length >= maxVideos) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <Video className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isDragActive ? 'Drop video here' : 'Drag & drop a video, or click to select'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          MP4, WebM, MOV — max 100 MB. {videos.length}/{maxVideos} uploaded.
        </p>
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading video…
          </div>
          <Progress value={progress} />
        </div>
      )}

      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map(v => (
            <div key={v.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                <Play className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm flex-1 truncate">{v.title ?? 'Property video'}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setVideos(prev => prev.filter(x => x.id !== v.id))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
