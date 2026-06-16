import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ProfessionalCard } from '@/components/professionals/ProfessionalCard'
import type { ProfessionalCardData } from '@/components/professionals/ProfessionalCard'
import { ProfessionalFilters } from '@/components/professionals/ProfessionalFilters'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'
import { PUBLIC_PROFESSIONAL_ROLES } from '@/lib/roles'

export const metadata: Metadata = {
  title: 'Find Professionals',
  description:
    'Browse verified real estate agents, contractors, architects, engineers, surveyors, lawyers, and more across Cameroon.',
}

type ProfRole = (typeof PUBLIC_PROFESSIONAL_ROLES)[number]

const PUBLIC_COLS =
  'id, full_name, display_name, avatar_url, city, role, is_premium, is_verified, company_name, years_experience, specialties, slug, created_at'

interface SearchParams {
  role?: string
  city?: string
  verified?: string
  premium?: string
  min_exp?: string
  sort?: string
  q?: string
}

export default async function ProfessionalsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  const selectedRole =
    (PUBLIC_PROFESSIONAL_ROLES as readonly string[]).includes(params.role ?? '')
      ? (params.role as ProfRole)
      : null

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('profiles')
    .select(PUBLIC_COLS)
    .in('role', selectedRole ? [selectedRole] : [...PUBLIC_PROFESSIONAL_ROLES])
    .not('slug', 'is', null)

  if (params.city)    query = query.eq('city', params.city)
  if (params.verified === 'true') query = query.eq('is_verified', true)
  if (params.premium  === 'true') query = query.eq('is_premium', true)
  if (params.min_exp) query = query.gte('years_experience', parseInt(params.min_exp, 10))

  if (params.q) {
    const term = params.q.trim()
    query = query.or(
      `full_name.ilike.%${term}%,display_name.ilike.%${term}%,company_name.ilike.%${term}%`,
    )
  }

  // Sort
  switch (params.sort) {
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    case 'experience':
      query = query
        .order('years_experience', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
      break
    default: // 'recommended' or 'premium'
      query = query
        .order('is_premium', { ascending: false })
        .order('is_verified', { ascending: false })
        .order('created_at', { ascending: false })
  }

  const { data: raw } = await query.limit(60) as { data: Record<string, any>[] | null }

  const professionals = raw ?? []

  // Fetch badge statuses in a single bulk call
  let badgeMap: Record<string, string> = {}
  if (professionals.length > 0) {
    const userIds = professionals.map((p) => p.id as string)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: badges } = await (supabase as any)
      .rpc('get_professional_badges', { p_user_ids: userIds }) as {
        data: { user_id: string; status: string }[] | null
      }
    badgeMap = Object.fromEntries(
      (badges ?? []).map((b) => [b.user_id, b.status])
    )
  }

  const cards: ProfessionalCardData[] = professionals
    .filter((p) => p.slug)
    .map((p) => ({
      id:               p.id as string,
      full_name:        p.full_name as string | null,
      display_name:     p.display_name as string | null,
      avatar_url:       p.avatar_url as string | null,
      role:             p.role as string,
      city:             p.city as string | null,
      company_name:     p.company_name as string | null,
      years_experience: p.years_experience as number | null,
      specialties:      (p.specialties as string[] | null) ?? [],
      is_premium:       (p.is_premium as boolean | null) ?? false,
      slug:             p.slug as string,
      badge_status:     badgeMap[p.id as string] ?? null,
    }))

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-blue-700 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white">Find Professionals</h1>
          <p className="mt-2 text-blue-100">
            Verified real estate agents, contractors, architects, engineers, lawyers, and vendors
            across Cameroon.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Role filter tabs */}
        <div className="flex gap-2 flex-wrap">
          <a
            href="/professionals"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
              !selectedRole
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent'
            }`}
          >
            All
          </a>
          {PUBLIC_PROFESSIONAL_ROLES.map((r) => (
            <a
              key={r}
              href={`/professionals?role=${r}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
                selectedRole === r
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-accent'
              }`}
            >
              {ROLE_LABELS[r as UserRole]}s
            </a>
          ))}
        </div>

        {/* Advanced filters (client component, updates URL params) */}
        <ProfessionalFilters />

        {/* Results */}
        {cards.length === 0 ? (
          <div className="rounded-xl border text-center py-16">
            <p className="text-sm text-muted-foreground">No professionals found</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {cards.length} professional{cards.length !== 1 ? 's' : ''}
              {selectedRole ? ` — ${ROLE_LABELS[selectedRole as UserRole]}s` : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((c) => (
                <ProfessionalCard key={c.id} professional={c} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
