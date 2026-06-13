'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import { toggleFavorite } from '@/lib/actions/properties'
import { useAuthStore } from '@/stores/authStore'
import type { PropertyWithImages } from '@/types/property'

async function fetchFavorites(): Promise<PropertyWithImages[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_favorites')
    .select('property:properties(*, property_images(*))')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data?.map(r => r.property).filter(Boolean) ?? []) as unknown as PropertyWithImages[]
}

async function fetchFavoriteIds(): Promise<Set<string>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_favorites')
    .select('property_id')

  if (error) return new Set()
  return new Set(data?.map(r => r.property_id) ?? [])
}

export function useFavorites() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  return useQuery({
    queryKey: queryKeys.favorites.list(),
    queryFn:  fetchFavorites,
    enabled:  isAuthenticated,
  })
}

export function useFavoriteIds() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  return useQuery({
    queryKey: queryKeys.favorites.ids(),
    queryFn:  fetchFavoriteIds,
    enabled:  isAuthenticated,
    staleTime: 30 * 1000,
  })
}

export function useToggleFavorite(propertyId: string) {
  const qc = useQueryClient()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())

  return useMutation({
    mutationFn: () => toggleFavorite(propertyId),

    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.favorites.ids() })
      const prev = qc.getQueryData<Set<string>>(queryKeys.favorites.ids())

      qc.setQueryData<Set<string>>(queryKeys.favorites.ids(), old => {
        const next = new Set(old ?? [])
        if (next.has(propertyId)) next.delete(propertyId)
        else next.add(propertyId)
        return next
      })

      return { prev }
    },

    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(result.data?.favorited ? 'Saved to favorites' : 'Removed from favorites')
      qc.invalidateQueries({ queryKey: queryKeys.favorites.list() })
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.favorites.ids(), ctx.prev)
      toast.error('Failed to update favorites')
    },
  })
}
