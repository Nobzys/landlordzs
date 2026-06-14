'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import type { PropertyWithDetails } from '@/types/property'

async function fetchProperty(id: string): Promise<PropertyWithDetails | null> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('properties')
    .select(`*, property_images(*), property_videos(*), property_amenities(*), owner:profiles!properties_owner_id_fkey(id, full_name, display_name, avatar_url, phone, is_verified), agent:profiles!properties_agent_id_fkey(id, full_name, display_name, avatar_url, phone, is_verified)`)
    .eq('id', id)
    .single() as { data: any; error: any }

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }

  return data as unknown as PropertyWithDetails
}

export function useProperty(id: string) {
  const query = useQuery({
    queryKey: queryKeys.properties.detail(id),
    queryFn:  () => fetchProperty(id),
    enabled:  !!id,
  })

  useEffect(() => {
    if (!id || !query.data) return

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any).rpc('increment_property_views', {
      p_property_id: id,
      p_viewer_id:   null,
      p_ip:          null,
    }).then(() => {})
  }, [id, query.data])

  return query
}
