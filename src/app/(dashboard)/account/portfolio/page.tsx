import type { Metadata } from 'next'
import { redirect, forbidden } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { deleteProject } from '@/lib/actions/portfolio'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { formatDate } from '@/lib/utils/format'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import { canManagePortfolio } from '@/lib/roles'

export const metadata: Metadata = { title: 'My Portfolio' }

type ProjectRow = {
  id:               string
  title:            string
  category:         string | null
  completion_year:  number | null
  is_public:        boolean
  created_at:       string
  cover_path:       string | null
}

export default async function PortfolioPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (!canManagePortfolio(profile.role)) forbidden()
  requireActiveProfile(profile)

  const supabase    = await createClient()
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawProjects } = await (supabase as any)
    .from('professional_projects')
    .select('id, title, category, completion_year, is_public, created_at, professional_project_images(storage_path, display_order)')
    .eq('professional_id', profile.id)
    .order('created_at', { ascending: false }) as { data: any[] | null }

  const projects: (ProjectRow & { signedCoverUrl: string | null })[] = await Promise.all(
    (rawProjects ?? []).map(async (p: any) => {
      const images: { storage_path: string; display_order: number }[] =
        Array.isArray(p.professional_project_images) ? p.professional_project_images : []
      const cover = images.sort((a, b) => a.display_order - b.display_order)[0]

      let signedCoverUrl: string | null = null
      if (cover?.storage_path) {
        const { data } = await adminClient.storage
          .from(STORAGE_BUCKETS.PROJECT_IMAGES)
          .createSignedUrl(cover.storage_path, 3600)
        signedCoverUrl = data?.signedUrl ?? null
      }

      return {
        id:              p.id,
        title:           p.title,
        category:        p.category,
        completion_year: p.completion_year,
        is_public:       p.is_public,
        created_at:      p.created_at,
        cover_path:      cover?.storage_path ?? null,
        signedCoverUrl,
      }
    })
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <LinkButton href="/account/portfolio/new" size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Project
        </LinkButton>
      </div>

      {/* Empty state */}
      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center space-y-3">
          <p className="text-sm font-medium text-muted-foreground">No projects yet</p>
          <p className="text-xs text-muted-foreground/70">
            Add your first project to showcase your work on your public profile.
          </p>
          <LinkButton href="/account/portfolio/new" variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Project
          </LinkButton>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl border bg-card p-4 flex items-start gap-4"
            >
              {/* Cover thumbnail */}
              <div className="h-16 w-24 shrink-0 rounded-md overflow-hidden bg-muted">
                {project.signedCoverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.signedCoverUrl}
                    alt={project.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                    No image
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{project.title}</p>
                  {project.is_public ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      <Eye className="h-2.5 w-2.5" />
                      Public
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      <EyeOff className="h-2.5 w-2.5" />
                      Private
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {[project.category, project.completion_year].filter(Boolean).join(' · ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Added {formatDate(project.created_at)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <LinkButton
                  href={`/account/portfolio/${project.id}/edit`}
                  variant="outline"
                  size="sm"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </LinkButton>
                <form
                  action={async () => {
                    'use server'
                    await deleteProject(project.id)
                    redirect('/account/portfolio')
                  }}
                >
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
