import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import { v4 as uuidv4 } from 'uuid'

const ALLOWED_BUCKETS = new Set([
  STORAGE_BUCKETS.PROPERTY_IMAGES,
  STORAGE_BUCKETS.PROPERTY_VIDEOS,
  STORAGE_BUCKETS.USER_AVATARS,
  STORAGE_BUCKETS.VERIFY_DOCS,
  STORAGE_BUCKETS.PROJECT_IMAGES,
])

// Private buckets: uploads return a short-lived signed URL instead of a public URL.
const PRIVATE_BUCKETS = new Set([
  STORAGE_BUCKETS.VERIFY_DOCS,
  STORAGE_BUCKETS.PROJECT_IMAGES,
])

const SIZE_LIMITS: Record<string, number> = {
  [STORAGE_BUCKETS.PROPERTY_IMAGES]:  10 * 1024 * 1024,
  [STORAGE_BUCKETS.PROPERTY_VIDEOS]: 100 * 1024 * 1024,
  [STORAGE_BUCKETS.USER_AVATARS]:      5 * 1024 * 1024,
  [STORAGE_BUCKETS.VERIFY_DOCS]:      10 * 1024 * 1024,
  [STORAGE_BUCKETS.PROJECT_IMAGES]:   25 * 1024 * 1024,
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData    = await request.formData()
  const file        = formData.get('file') as File | null
  const bucket      = formData.get('bucket') as string | null
  const resourceId  = formData.get('resource_id') as string | null

  if (!file || !bucket || !resourceId) {
    return NextResponse.json({ error: 'file, bucket, and resource_id are required' }, { status: 400 })
  }

  if (!ALLOWED_BUCKETS.has(bucket as any)) {
    return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
  }

  const sizeLimit = SIZE_LIMITS[bucket] ?? 10 * 1024 * 1024
  if (file.size > sizeLimit) {
    return NextResponse.json({ error: `File too large (max ${sizeLimit / 1024 / 1024} MB)` }, { status: 413 })
  }

  const ext  = file.name.split('.').pop()
  const path = `${user.id}/${resourceId}/${uuidv4()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType:  file.type,
      cacheControl: '3600',
      upsert:       false,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (PRIVATE_BUCKETS.has(bucket as any)) {
    const { data: signed } = await admin.storage.from(bucket).createSignedUrl(path, 3600)
    return NextResponse.json({ url: signed?.signedUrl ?? null, path })
  }

  const { data: { publicUrl } } = admin.storage.from(bucket).getPublicUrl(path)
  return NextResponse.json({ url: publicUrl, path })
}
