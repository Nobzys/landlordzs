'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import type { ActionResult } from '@/types/auth'

const PROFESSIONAL_ROLES = new Set(['agent', 'vendor', 'contractor', 'engineer', 'architect', 'lawyer'])
const BUCKET = STORAGE_BUCKETS.PROJECT_IMAGES

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ─── Project CRUD ─────────────────────────────────────────────────────────────

export interface ProjectInput {
  title:              string
  description?:       string
  category?:          string
  completion_year?:   number | null
  location?:          string
  client_name?:       string
  client_testimonial?: string
  is_public:          boolean
}

export async function createProject(
  data: ProjectInput
): Promise<ActionResult<{ id: string }>> {
  if (!data.title?.trim()) return { error: 'Title is required.' }

  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated.' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !PROFESSIONAL_ROLES.has(profile.role)) {
    return { error: 'Only professionals can manage portfolio projects.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from('professional_projects')
    .insert({
      professional_id:    user.id,
      title:              data.title.trim(),
      description:        data.description?.trim() ?? null,
      category:           data.category?.trim() ?? null,
      completion_year:    data.completion_year ?? null,
      location:           data.location?.trim() ?? null,
      client_name:        data.client_name?.trim() ?? null,
      client_testimonial: data.client_testimonial?.trim() ?? null,
      is_public:          data.is_public,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createProject] insert failed:', error)
    return { error: error.message }
  }

  revalidatePath('/account/portfolio')
  return { success: true, data: { id: row.id } }
}

export async function updateProject(
  id: string,
  data: Partial<ProjectInput>
): Promise<ActionResult> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated.' }

  const supabase = await createClient()

  // Verify ownership before update
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('professional_projects')
    .select('id')
    .eq('id', id)
    .eq('professional_id', user.id)
    .maybeSingle()

  if (!existing) return { error: 'Project not found or access denied.' }

  const patch: Record<string, unknown> = {}
  if (data.title        !== undefined) patch.title              = data.title.trim()
  if (data.description  !== undefined) patch.description        = data.description?.trim() ?? null
  if (data.category     !== undefined) patch.category           = data.category?.trim() ?? null
  if (data.completion_year !== undefined) patch.completion_year = data.completion_year ?? null
  if (data.location     !== undefined) patch.location           = data.location?.trim() ?? null
  if (data.client_name  !== undefined) patch.client_name        = data.client_name?.trim() ?? null
  if (data.client_testimonial !== undefined) patch.client_testimonial = data.client_testimonial?.trim() ?? null
  if (data.is_public    !== undefined) patch.is_public          = data.is_public

  if (Object.keys(patch).length === 0) return { success: true }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('professional_projects')
    .update(patch)
    .eq('id', id)
    .eq('professional_id', user.id)

  if (error) {
    console.error('[updateProject] update failed:', error)
    return { error: error.message }
  }

  revalidatePath('/account/portfolio')
  revalidatePath(`/account/portfolio/${id}/edit`)
  return { success: true }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated.' }

  const supabase   = await createClient()
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project } = await (supabase as any)
    .from('professional_projects')
    .select('id, professional_id')
    .eq('id', id)
    .eq('professional_id', user.id)
    .maybeSingle()

  if (!project) return { error: 'Project not found or access denied.' }

  // Fetch all image paths before deleting (cascade removes DB rows but not storage)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: images } = await (supabase as any)
    .from('professional_project_images')
    .select('storage_path')
    .eq('project_id', id) as { data: { storage_path: string }[] | null }

  // Delete images from storage
  if (images && images.length > 0) {
    const paths = images.map((i) => i.storage_path)
    const { error: storageError } = await adminClient.storage.from(BUCKET).remove(paths)
    if (storageError) console.error('[deleteProject] storage removal failed:', storageError)
  }

  // Delete the project row (images cascade in DB)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('professional_projects')
    .delete()
    .eq('id', id)
    .eq('professional_id', user.id)

  if (error) {
    console.error('[deleteProject] delete failed:', error)
    return { error: error.message }
  }

  revalidatePath('/account/portfolio')
  return { success: true }
}

// ─── Image management ─────────────────────────────────────────────────────────

export async function addProjectImage(
  projectId:    string,
  storagePath:  string,
  displayOrder: number,
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated.' }

  const supabase = await createClient()

  // Verify project ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project } = await (supabase as any)
    .from('professional_projects')
    .select('id')
    .eq('id', projectId)
    .eq('professional_id', user.id)
    .maybeSingle()

  if (!project) return { error: 'Project not found or access denied.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from('professional_project_images')
    .insert({ project_id: projectId, storage_path: storagePath, display_order: displayOrder })
    .select('id')
    .single()

  if (error) {
    console.error('[addProjectImage] insert failed:', error)
    return { error: error.message }
  }

  revalidatePath(`/account/portfolio/${projectId}/edit`)
  return { success: true, data: { id: row.id } }
}

export async function deleteProjectImage(
  imageId:     string,
  storagePath: string,
): Promise<ActionResult> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated.' }

  const supabase    = await createClient()
  const adminClient = createAdminClient()

  // Verify ownership via join
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: img } = await (supabase as any)
    .from('professional_project_images')
    .select('id, project_id, professional_projects!inner(professional_id)')
    .eq('id', imageId)
    .maybeSingle() as { data: any | null }

  const owner = Array.isArray(img?.professional_projects)
    ? img.professional_projects[0]?.professional_id
    : img?.professional_projects?.professional_id

  if (!img || owner !== user.id) return { error: 'Image not found or access denied.' }

  // Delete from storage
  const { error: storageError } = await adminClient.storage.from(BUCKET).remove([storagePath])
  if (storageError) console.error('[deleteProjectImage] storage removal failed:', storageError)

  // Delete from DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('professional_project_images')
    .delete()
    .eq('id', imageId)

  if (error) {
    console.error('[deleteProjectImage] delete failed:', error)
    return { error: error.message }
  }

  revalidatePath(`/account/portfolio/${img.project_id}/edit`)
  return { success: true }
}

export async function reorderProjectImages(
  images: { id: string; display_order: number }[],
): Promise<ActionResult> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated.' }

  if (images.length === 0) return { success: true }

  const supabase = await createClient()

  // Run updates in sequence — small lists so performance is fine
  for (const img of images) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('professional_project_images')
      .update({ display_order: img.display_order })
      .eq('id', img.id)

    if (error) {
      console.error('[reorderProjectImages] update failed:', error)
      return { error: error.message }
    }
  }

  return { success: true }
}
