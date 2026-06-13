'use client'

import { useState, useCallback } from 'react'

interface UploadState {
  isUploading: boolean
  progress: number
  error: string | null
}

interface UseUploadOptions {
  onSuccess?: (url: string, path: string) => void
  onError?: (error: string) => void
}

type UploadFn = (file: File) => Promise<{ url: string; path: string }>

export function useUpload(uploadFn: UploadFn, options: UseUploadOptions = {}) {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  })

  const upload = useCallback(
    async (file: File) => {
      setState({ isUploading: true, progress: 0, error: null })

      try {
        const result = await uploadFn(file)
        setState({ isUploading: false, progress: 100, error: null })
        options.onSuccess?.(result.url, result.path)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setState({ isUploading: false, progress: 0, error: message })
        options.onError?.(message)
        return null
      }
    },
    [uploadFn, options]
  )

  const reset = useCallback(() => {
    setState({ isUploading: false, progress: 0, error: null })
  }, [])

  return { ...state, upload, reset }
}
