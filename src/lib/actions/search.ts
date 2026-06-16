'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { PUBLIC_PROFESSIONAL_ROLES } from '@/lib/roles'
import type { ActionResult } from '@/types/auth'

const PROF_COLS =
  'id, full_name, display_name, avatar_url, city, role, is_premium, is_verified, company_name, years_experience, specialties, slug'

const PROP_COLS =
  'id, title, city, neighborhood, price, listing_type, property_type, bedrooms, bathrooms, is_featured, is_verified, slug, property_images(url, is_primary)'

export interface UnifiedSearchResult {
  properties: Record<string, unknown>[]
  professionals: Record<string, unknown>[]
  vendors: Record<string, unknown>[]
  totalProperties: number
  totalProfessionals: number
  totalVendors: number
}

export async function globalSearch(
  q: string,
): Promise<ActionResult<UnifiedSearchResult>> {
  if (!q || q.trim().length < 2) {
    return {
      data: {
        properties: [],
        professionals: [],
        vendors: [],
        totalProperties: 0,
        totalProfessionals: 0,
        totalVendors: 0,
      },
    }
  }

  const supabase = await createClient()
  const term = q.trim()

  // Professionals (non-vendor public roles)
  const profRoles = PUBLIC_PROFESSIONAL_ROLES.filter((r) => r !== 'vendor')
  const vendorRoles = ['vendor'] as const

  const [propResult, profResult, vendorResult] = await Promise.all([
    (supabase as any)
      .from('properties')
      .select(PROP_COLS, { count: 'exact' })
      .eq('status', 'active')
      .or(`title.ilike.%${term}%,neighborhood.ilike.%${term}%,city.ilike.%${term}%`)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(6) as Promise<{ data: Record<string, unknown>[] | null; count: number | null; error: any }>,

    (supabase as any)
      .from('profiles')
      .select(PROF_COLS, { count: 'exact' })
      .in('role', profRoles)
      .not('slug', 'is', null)
      .or(
        `full_name.ilike.%${term}%,display_name.ilike.%${term}%,company_name.ilike.%${term}%,city.ilike.%${term}%`,
      )
      .order('is_premium', { ascending: false })
      .limit(4) as Promise<{ data: Record<string, unknown>[] | null; count: number | null; error: any }>,

    (supabase as any)
      .from('profiles')
      .select(PROF_COLS, { count: 'exact' })
      .in('role', vendorRoles)
      .not('slug', 'is', null)
      .or(
        `full_name.ilike.%${term}%,display_name.ilike.%${term}%,company_name.ilike.%${term}%,city.ilike.%${term}%`,
      )
      .order('is_premium', { ascending: false })
      .limit(4) as Promise<{ data: Record<string, unknown>[] | null; count: number | null; error: any }>,
  ])

  // Log analytics (fire and forget)
  logSearch(term, 'all', (propResult.count ?? 0) + (profResult.count ?? 0) + (vendorResult.count ?? 0))

  return {
    data: {
      properties:        propResult.data ?? [],
      professionals:     profResult.data ?? [],
      vendors:           vendorResult.data ?? [],
      totalProperties:   propResult.count ?? 0,
      totalProfessionals: profResult.count ?? 0,
      totalVendors:      vendorResult.count ?? 0,
    },
  }
}

// Fire-and-forget analytics — uses admin client to bypass RLS
async function logSearch(query: string, entityType: string, resultCount: number) {
  try {
    const adminClient = createAdminClient()
    await (adminClient as any).from('search_analytics').insert({
      query,
      entity_type: entityType,
      result_count: resultCount,
    })
  } catch {
    // non-critical
  }
}

export async function logSearchEvent(
  query: string,
  entityType: string,
  resultCount: number,
): Promise<void> {
  await logSearch(query, entityType, resultCount)
}
