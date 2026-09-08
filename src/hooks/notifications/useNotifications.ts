'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getNotifications } from '@/lib/actions/notifications'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/authStore'

export function useNotifications() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn:  getNotifications,
    enabled:  isAuthenticated,
    staleTime: 30 * 1000,
  })

  useEffect(() => {
    if (!isAuthenticated) return
    const supabase = createClient()
    const channel = supabase
      .channel('lzs:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isAuthenticated, queryClient])

  const notifications = query.data ?? []
  const unreadCount = notifications.filter(n => !n.is_read).length

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    refetch:   query.refetch,
  }
}
