import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { ProjectForm } from '@/components/portfolio/ProjectForm'
import { ProjectImageManager } from '@/components/portfolio/ProjectImageManager'
import type { ManagedImage } from '@/components/portfolio/ProjectImageManager'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import type { ProjectInput } from '@/lib/actions/portfolio'

export const metadata: Metadata = { title: 'Edit Project' }

const PROFESSIONAL_ROLES = new Set(['agent', 'vendor', 'contractor', 'engineer', 'architect', 'lawyer'])

interface Params { id: string }

export default async function EditProjectPage({ params }: { params: Promise<Params> }) {
  const { id } = await params

  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (!PROFESSIONAL_ROLES.has(profile.role)) redirect('/account/profile')
  requireActiveProfile(profile)

  const supabase    = await createClient()
  const adminClient = createAdminClient()

  // Fetch project (ownership enforced by RLS — the owner can always see their own)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project } = await (supabase as any)
    .from('professional_projects')
    .select('id, title, description, category, completion_year, location, client_name, client_testimonial, is_public, professional_project_images(id, storage_path, display_order)')
    .eq('id', id)
    .eq('professional_id', profile.id)
    .maybeSingle() as { data: any | null }

  if (!project) notFound()

  // Generate signed URLs for existing images
  const rawImages: { id: string; storage_path: string; display_order: number }[] =
    Array.isArray(project.professional_project_images)
      ? project.professional_project_images
      : []

  const managedImages: ManagedImage[] = await Promise.all(
    rawImages
      .sort((a, b) => a.display_order - b.display_order)
      .map(async (img) => {
        const { data } = await adminClient.storage
          .from(STORAGE_BUCKETS.PROJECT_IMAGES)
          .createSignedUrl(img.storage_path, 3600)
        return {
          id:           img.id,
          signedUrl:    data?.signedUrl ?? '',
          storagePath:  img.storage_path,
          display_order: img.display_order,
        }
      })
  )

  const defaultValues: Partial<ProjectInput> = {
    title:              project.title,
    description:        project.description ?? undefined,
    category:           project.category ?? undefined,
    completion_year:    project.completion_year ?? null,
    location:           project.location ?? undefined,
    client_name:        project.client_name ?? undefined,
    client_testimonial: project.client_testimonial ?? undefined,
    is_public:          project.is_public,
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/account/portfolio">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Project</h1>
          <p className="text-sm text-muted-foreground truncate max-w-xs">
            {project.title}
          </p>
        </div>
      </div>

      {/* Project details */}
      <div className="rounded-xl border bg-card p-6 space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Project Details
        </h2>
        <ProjectForm projectId={id} defaultValues={defaultValues} />
      </div>

      <Separator />

      {/* Images */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Images
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            The first image is used as the cover photo on your public profile.
          </p>
        </div>
        <ProjectImageManager projectId={id} initialImages={managedImages} />
      </div>
    </div>
  )
}
