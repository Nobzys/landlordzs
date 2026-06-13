'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import { useDebounce } from '@/hooks/shared/useDebounce'
import type { PropertyWithImages } from '@/types/property'

async function searchProperties(q: string): Promise<PropertyWithImages[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*, property_images(*)')
    .eq('status', 'active')
    .or(`title.ilike.%${q}%,neighborhood.ilike.%${q}%,address.ilike.%${q}%`)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as PropertyWithImages[]
}

export function usePropertySearch(query: string) {
  const debounced = useDebounce(query.trim(), 400)

  return useQuery({
    queryKey: queryKeys.properties.search(debounced),
    queryFn:  () => searchProperties(debounced),
    enabled:  debounced.length >= 2,
    staleTime: 30 * 1000,
  })
}
