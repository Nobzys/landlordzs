import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfessionalProfile } from '@/components/professionals/ProfessionalProfile'
import type { ProfessionalProfileData } from '@/components/professionals/ProfessionalProfile'

const PROFESSIONAL_ROLES = [
  'agent', 'vendor', 'contractor', 'engineer', 'architect', 'lawyer',
] as const

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

  if (!(PROFESSIONAL_ROLES as readonly string[]).includes(role)) notFound()

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

  // Fetch verification badge status via SECURITY DEFINER function.
  // Returns 'approved', 'under_review', 'expired', or null (no badge).
  // Never returns 'rejected' — rejected professionals show no badge.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: badgeStatus } = await (supabase as any)
    .rpc('get_professional_badge_status', { p_user_id: raw.id }) as { data: string | null }

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
    badge_status:     badgeStatus ?? null,
  }

  return <ProfessionalProfile profile={profile} />
}
