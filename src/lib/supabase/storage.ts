'use client'

import { createClient } from './client'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import { v4 as uuidv4 } from 'uuid'

export interface UploadResult {
  url: string
  path: string
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024  // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export function getPublicUrl(bucket: string, path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadPropertyImage(
  propertyId: string,
  file: File,
  userId: string
): Promise<UploadResult> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('File must be JPEG, PNG, WebP, or AVIF')
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Image must be smaller than 10 MB')
  }

  const ext  = file.name.split('.').pop()
  const path = `${userId}/${propertyId}/${uuidv4()}.${ext}`

  const supabase = createClient()
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.PROPERTY_IMAGES)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw new Error(error.message)

  return { path, url: getPublicUrl(STORAGE_BUCKETS.PROPERTY_IMAGES, path) }
}

export async function uploadPropertyVideo(
  propertyId: string,
  file: File,
  userId: string
): Promise<UploadResult> {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    throw new Error('File must be MP4, WebM, or MOV')
  }
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error('Video must be smaller than 100 MB')
  }

  const ext  = file.name.split('.').pop()
  const path = `${userId}/${propertyId}/${uuidv4()}.${ext}`

  const supabase = createClient()
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.PROPERTY_VIDEOS)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw new Error(error.message)

  return { path, url: getPublicUrl(STORAGE_BUCKETS.PROPERTY_VIDEOS, path) }
}

export async function uploadAvatar(file: File, userId: string): Promise<UploadResult> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Avatar must be JPEG, PNG, or WebP')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Avatar must be smaller than 5 MB')
  }

  const ext  = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`

  const supabase = createClient()
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.USER_AVATARS)
    .upload(path, file, { cacheControl: '3600', upsert: true })

  if (error) throw new Error(error.message)

  return { path, url: getPublicUrl(STORAGE_BUCKETS.USER_AVATARS, path) }
}

export async function uploadViaApi(
  bucket: string,
  resourceId: string,
  file: File
): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('bucket', bucket)
  form.append('resource_id', resourceId)

  const res = await fetch('/api/upload', { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Upload failed')
  return { url: data.url as string, path: data.path as string }
}

export async function deleteStorageFile(bucket: string, path: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw new Error(error.message)
}
