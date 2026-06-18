import { createClient } from '@/lib/supabase/server'
import { getCapabilities, type RoleCapabilities } from '@/lib/config/roleCapabilities'
import type { UserRole } from '@/types/auth'

// Loader shared by every public profile route (/sellers/[id], /professionals/[id]).
// Deliberately selects a fixed, safe column list on `profiles` — never `email`
// or `phone` — so a public page can never leak contact details regardless of
// what other code touches this table later.
const PUBLIC_PROFILE_COLS =
  'id, full_name, display_name, avatar_url, bio, city, role, is_verified, is_public, created_at'

export interface PublicReviewItem {
  id: string
  rating: number
  title: string | null
  body: string | null
  cleanliness: number | null
  communication: number | null
  value: number | null
  accuracy: number | null
  created_at: string
  reviewer: { full_name: string | null; display_name: string | null; avatar_url: string | null } | null
}

export interface PublicPortfolioItem {
  id: string
  title: string
  description: string | null
  project_type: string | null
  city: string | null
  completed_at: string | null
  is_featured: boolean
  images: { id: string; url: string; caption: string | null; is_cover: boolean }[]
}

export interface PublicProfileData {
  id: string
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  city: string | null
  role: UserRole
  is_verified: boolean
  created_at: string
  capabilities: RoleCapabilities
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extension: Record<string, any> | null
  reviews: { items: PublicReviewItem[]; average: number; count: number }
  portfolio: PublicPortfolioItem[]
  properties: { active: number; soldOrRented: number } | null
}

export async function getPublicProfile(id: string): Promise<PublicProfileData | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: { user: viewer } } = await supabase.auth.getUser()

  const { data: profile } = await sb
    .from('profiles')
    .select(PUBLIC_PROFILE_COLS)
    .eq('id', id)
    .maybeSingle()

  if (!profile) return null
  if (!profile.is_public && viewer?.id !== profile.id) return null

  const capabilities = getCapabilities(profile.role as UserRole)
  if (!capabilities.hasPublicProfile) return null

  const [extensionRes, reviewsRes, portfolioRes, propertiesRes] = await Promise.all([
    capabilities.profileTable
      ? sb.from(capabilities.profileTable).select('*').eq('id', id).maybeSingle()
      : Promise.resolve({ data: null }),

    capabilities.receivesReviews
      ? sb
          .from('reviews')
          .select('id, rating, title, body, cleanliness, communication, value, accuracy, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name, display_name, avatar_url)')
          .eq('target_type', profile.role)
          .eq('target_id', id)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),

    capabilities.hasPortfolio
      ? sb
          .from('portfolio_items')
          .select('id, title, description, project_type, city, completed_at, is_featured, portfolio_images(id, url, caption, is_cover)')
          .eq('professional_id', id)
          .order('is_featured', { ascending: false })
          .order('completed_at', { ascending: false })
      : Promise.resolve({ data: [] }),

    profile.role === 'seller'
      ? Promise.all([
          sb.from('properties').select('id', { count: 'exact', head: true }).eq('owner_id', id).in('status', ['active', 'under_offer']),
          sb.from('properties').select('id', { count: 'exact', head: true }).eq('owner_id', id).in('status', ['sold', 'rented']),
        ])
      : Promise.resolve(null),
  ])

  const reviewItems: PublicReviewItem[] = reviewsRes.data ?? []
  const average = reviewItems.length > 0
    ? Math.round((reviewItems.reduce((s, r) => s + r.rating, 0) / reviewItems.length) * 100) / 100
    : 0

  const portfolio: PublicPortfolioItem[] = (portfolioRes.data ?? []).map((item: any) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    project_type: item.project_type,
    city: item.city,
    completed_at: item.completed_at,
    is_featured: item.is_featured,
    images: item.portfolio_images ?? [],
  }))

  const properties = propertiesRes
    ? { active: propertiesRes[0].count ?? 0, soldOrRented: propertiesRes[1].count ?? 0 }
    : null

  return {
    id: profile.id,
    full_name: profile.full_name,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    city: profile.city,
    role: profile.role,
    is_verified: profile.is_verified,
    created_at: profile.created_at,
    capabilities,
    extension: extensionRes.data ?? null,
    reviews: { items: reviewItems, average, count: reviewItems.length },
    portfolio,
    properties,
  }
}
