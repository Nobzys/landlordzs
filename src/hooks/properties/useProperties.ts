'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import type { PropertyFilters, PropertyWithImages } from '@/types/property'

const PAGE_SIZE = 12

async function fetchProperties(
  filters: PropertyFilters,
  page: number
): Promise<{ items: PropertyWithImages[]; total: number }> {
  const supabase = createClient()
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let query = supabase
    .from('properties')
    .select('*, property_images(*)', { count: 'exact' })
    .eq('status', 'active')
    .range(from, to)

  if (filters.listing_type)  query = query.eq('listing_type', filters.listing_type)
  if (filters.property_type) query = query.eq('property_type', filters.property_type)
  if (filters.city)          query = query.eq('city', filters.city)
  if (filters.min_price)     query = query.gte('price', filters.min_price)
  if (filters.max_price)     query = query.lte('price', filters.max_price)
  if (filters.bedrooms)      query = query.gte('bedrooms', filters.bedrooms)
  if (filters.bathrooms)     query = query.gte('bathrooms', filters.bathrooms)
  if (filters.is_furnished !== undefined)  query = query.eq('is_furnished', filters.is_furnished)
  if (filters.is_negotiable !== undefined) query = query.eq('is_negotiable', filters.is_negotiable)
  if (filters.has_security !== undefined)  query = query.eq('has_security', filters.has_security)
  if (filters.has_generator !== undefined) query = query.eq('has_generator', filters.has_generator)
  if (filters.is_verified !== undefined)   query = query.eq('is_verified', filters.is_verified)

  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`)
  }

  switch (filters.sort_by) {
    case 'oldest':      query = query.order('created_at', { ascending: true });  break
    case 'price_asc':   query = query.order('price', { ascending: true });        break
    case 'price_desc':  query = query.order('price', { ascending: false });       break
    case 'most_viewed': query = query.order('view_count', { ascending: false });  break
    default:            query = query.order('created_at', { ascending: false });
  }

  const { data, count, error } = await query
  if (error) throw new Error(error.message)

  return { items: (data ?? []) as PropertyWithImages[], total: count ?? 0 }
}

export function useProperties(filters: PropertyFilters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.properties.list(filters),
    queryFn:  ({ pageParam }) => fetchProperties(filters, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.items.length, 0)
      return loaded < lastPage.total ? allPages.length + 1 : undefined
    },
  })
}
