'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/types/auth'

export async function trackView(
  entityType: 'property' | 'professional',
  entityId: string,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const adminClient = createAdminClient()

  // Upsert: update viewed_at if already exists
  await (adminClient as any)
    .from('recently_viewed')
    .upsert(
      { user_id: user.id, entity_type: entityType, entity_id: entityId, viewed_at: new Date().toISOString() },
      { onConflict: 'user_id,entity_type,entity_id' },
    )
}

export async function getRecentlyViewed(
  entityType?: 'property' | 'professional',
  limit = 10,
): Promise<ActionResult<Record<string, unknown>[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [] }

  let query = (supabase as any)
    .from('recently_viewed')
    .select('entity_type, entity_id, viewed_at')
    .eq('user_id', user.id)
    .order('viewed_at', { ascending: false })
    .limit(limit)

  if (entityType) query = query.eq('entity_type', entityType)

  const { data, error } = await query as {
    data: { entity_type: string; entity_id: string; viewed_at: string }[] | null
    error: any
  }

  if (error) return { error: error.message }

  const rows = data ?? []
  if (rows.length === 0) return { data: [] }

  // Fetch entity details for each row
  const propertyIds  = rows.filter((r) => r.entity_type === 'property').map((r) => r.entity_id)
  const profIds      = rows.filter((r) => r.entity_type === 'professional').map((r) => r.entity_id)

  const [propRes, profRes] = await Promise.all([
    propertyIds.length > 0
      ? (supabase as any)
          .from('properties')
          .select('id, title, city, price, listing_type, property_type, property_images(url, is_primary)')
          .in('id', propertyIds)
          .eq('status', 'active') as Promise<{ data: Record<string, unknown>[] | null }>
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),

    profIds.length > 0
      ? (supabase as any)
          .from('profiles')
          .select('id, full_name, display_name, avatar_url, role, city, slug, is_premium, company_name')
          .in('id', profIds)
          .not('slug', 'is', null) as Promise<{ data: Record<string, unknown>[] | null }>
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ])

  const propMap  = Object.fromEntries((propRes.data ?? []).map((p) => [p.id as string, p]))
  const profMap  = Object.fromEntries((profRes.data ?? []).map((p) => [p.id as string, p]))

  const enriched = rows
    .map((r) => {
      const detail = r.entity_type === 'property' ? propMap[r.entity_id] : profMap[r.entity_id]
      if (!detail) return null
      return { ...detail, entity_type: r.entity_type, viewed_at: r.viewed_at }
    })
    .filter(Boolean) as Record<string, unknown>[]

  return { data: enriched }
}
