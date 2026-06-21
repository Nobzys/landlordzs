import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import type { Profile } from '@/types/auth'

// Server Component / Server Action Supabase client.
// Must be called inside a Server Component or 'use server' function.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context: cookie mutations are a no-op.
            // Only Route Handlers and Server Actions can set cookies.
          }
        },
      },
    }
  )
}

// Convenience: get the current authenticated user from the server.
// Throws if called in a context where cookies are unavailable.
export async function getServerUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

// Convenience: get the current user's profile row.
// When no row exists (table not yet seeded / brand-new user), builds a
// provisional Profile from auth.user_metadata so onboarding can render.
export async function getServerProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // profiles_safe (not the base table): the self row comes back with every
  // column intact, but querying the base table directly for these columns
  // is blocked by privilege for the `authenticated` role — see
  // 20260624000001_profiles_safe_view.sql.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles_safe')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile) return profile as Profile

  // No DB row yet — synthesise from auth metadata so callers never get null
  // for an authenticated user who simply hasn't been onboarded yet.
  const meta = (user.user_metadata ?? {}) as Record<string, string>
  const now  = new Date().toISOString()
  return {
    id:                   user.id,
    email:                user.email ?? '',
    full_name:            meta.full_name   ?? null,
    display_name:         null,
    role:                 (meta.role       ?? 'buyer') as Profile['role'],
    city:                 null,
    phone:                null,
    phone_verified:       false,
    avatar_url:           null,
    bio:                  null,
    is_verified:          false,
    verified_at:          null,
    is_premium:           false,
    is_public:            true,
    profile_view_count:   0,
    account_status:       'active'          as Profile['account_status'],
    onboarding_completed: false,
    expo_push_token:      null,
    approved_at:          null,
    approved_by:          null,
    rejected_at:          null,
    rejected_by:          null,
    registration_completed_at: null,
    slug:                 null,
    cover_url:            null,
    company_name:         null,
    years_experience:     null,
    specialties:          [],
    service_areas:        [],
    website_url:          null,
    kyc_level:            'none',
    email_visibility:     false,
    phone_visibility:     false,
    created_at:           now,
    updated_at:           now,
  }
}
