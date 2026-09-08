'use client'

import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getNotifications } from '@/lib/actions/notifications'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/authStore'

export function useNotifications() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  const queryClient = useQueryClient()

  // createBrowserClient returns a singleton (same instance for same URL+key).
  // If two components both call useNotifications(), they share that singleton
  // and would collide on a fixed channel name — the second .on('postgres_changes')
  // call throws "cannot add callbacks after subscribed". A per-instance unique
  // name ensures each hook mount owns its own channel on the shared client.
  const channelName = useRef(`lzs:notifications:${Math.random().toString(36).slice(2)}`).current

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
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isAuthenticated, queryClient, channelName])

  const notifications = query.data ?? []
  const unreadCount = notifications.filter(n => !n.is_read).length

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    refetch:   query.refetch,
  }
}
