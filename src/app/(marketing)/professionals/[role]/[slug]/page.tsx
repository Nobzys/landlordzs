import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProfessionalProfile } from '@/components/professionals/ProfessionalProfile'
import type { ProfessionalProfileData, PublicProject } from '@/components/professionals/ProfessionalProfile'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import { PUBLIC_PROFESSIONAL_ROLES } from '@/lib/roles'

// Public-safe columns only. Never includes: email, phone, address,
// kyc_level, account_status, expo_push_token, or any verification document data.
const PUBLIC_COLS =
  'id, full_name, display_name, avatar_url, bio, city, role, is_premium, created_at, company_name, years_experience, specialties, service_areas, website_url, slug'

interface Params { role: string; slug: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { role, slug } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('profiles')
    .select('full_name, display_name, bio')
    .eq('slug', slug)
    .eq('role', role)
    .maybeSingle() as { data: { full_name: string | null; display_name: string | null; bio: string | null } | null }

  if (!data) return { title: 'Professional Not Found' }

  const name = data.display_name ?? data.full_name ?? 'Professional'
  return {
    title: name,
    description: data.bio?.slice(0, 160) ?? undefined,
  }
}

export default async function ProfessionalProfilePage({
  params,
}: {
  params: Promise<Params>
}) {
  const { role, slug } = await params

  if (!(PUBLIC_PROFESSIONAL_ROLES as readonly string[]).includes(role)) notFound()

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (supabase as any)
    .from('profiles')
    .select(PUBLIC_COLS)
    .eq('slug', slug)
    .eq('role', role)
    .eq('account_status', 'active')
    .maybeSingle() as { data: Record<string, unknown> | null }

  if (!raw) notFound()

  const adminClient = createAdminClient()

  // Fetch badge status + public projects in parallel
  const [badgeResult, projectsResult] = await Promise.all([
    // Verification badge (SECURITY DEFINER — bypasses RLS safely)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_professional_badge_status', { p_user_id: raw.id }) as Promise<{ data: string | null }>,

    // Public projects — only is_public = true rows (enforced by RLS + filter)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('professional_projects')
      .select('id, title, description, category, completion_year, location, client_testimonial, professional_project_images(storage_path, display_order)')
      .eq('professional_id', raw.id)
      .eq('is_public', true)
      .order('completion_year', { ascending: false })
      .limit(20) as Promise<{ data: any[] | null }>,
  ])

  // Generate signed URLs for project images using admin client (private bucket)
  const rawProjects: any[] = projectsResult.data ?? []
  const projects: PublicProject[] = await Promise.all(
    rawProjects.map(async (proj) => {
      const rawImages: { storage_path: string; display_order: number }[] =
        Array.isArray(proj.professional_project_images)
          ? proj.professional_project_images
          : []

      const images = await Promise.all(
        rawImages.map(async (img) => {
          const { data } = await adminClient.storage
            .from(STORAGE_BUCKETS.PROJECT_IMAGES)
            .createSignedUrl(img.storage_path, 3600)
          return {
            signedUrl:    data?.signedUrl ?? '',
            display_order: img.display_order,
          }
        })
      )

      return {
        id:                proj.id,
        title:             proj.title,
        description:       proj.description ?? null,
        category:          proj.category ?? null,
        completion_year:   proj.completion_year ?? null,
        location:          proj.location ?? null,
        client_testimonial: proj.client_testimonial ?? null,
        images:            images.filter(i => i.signedUrl),
      }
    })
  )

  const profile: ProfessionalProfileData = {
    id:               raw.id as string,
    full_name:        raw.full_name as string | null,
    display_name:     raw.display_name as string | null,
    avatar_url:       raw.avatar_url as string | null,
    bio:              raw.bio as string | null,
    role:             raw.role as string,
    city:             raw.city as string | null,
    is_premium:       (raw.is_premium as boolean | null) ?? false,
    created_at:       raw.created_at as string,
    company_name:     raw.company_name as string | null,
    years_experience: raw.years_experience as number | null,
    specialties:      (raw.specialties as string[] | null) ?? [],
    service_areas:    (raw.service_areas as string[] | null) ?? [],
    website_url:      raw.website_url as string | null,
    badge_status:     badgeResult.data ?? null,
    projects,
  }

  return <ProfessionalProfile profile={profile} />
}
