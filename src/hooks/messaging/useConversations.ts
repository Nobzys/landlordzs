'use client'

import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getConversations } from '@/lib/actions/messaging'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/authStore'

export function useConversations() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  const queryClient = useQueryClient()
  // Instance-unique suffix prevents conflicts if the hook is ever mounted in
  // more than one component simultaneously (same Supabase singleton client).
  const channelName = useRef(`lzs:messaging:conversations:${Math.random().toString(36).slice(2, 7)}`)

  const query = useQuery({
    queryKey: queryKeys.messaging.conversations(),
    queryFn:  getConversations,
    enabled:  isAuthenticated,
    staleTime: 30 * 1000,
  })

  useEffect(() => {
    if (!isAuthenticated) return
    const supabase = createClient()
    const channel = supabase
      .channel(channelName.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations() })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations() })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isAuthenticated, queryClient])

  const totalUnread = query.data?.reduce((sum, c) => sum + c.unread_count, 0) ?? 0
  return { ...query, totalUnread }
}
