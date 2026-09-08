'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getMessages } from '@/lib/actions/messaging'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/authStore'

export function useMessages(conversationId: string) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  const queryClient = useQueryClient()

  const { data: rawMessages, ...rest } = useQuery({
    queryKey: queryKeys.messaging.messages(conversationId),
    queryFn:  () => getMessages(conversationId),
    enabled:  isAuthenticated && !!conversationId,
    staleTime: 10 * 1000,
  })

  useEffect(() => {
    if (!isAuthenticated || !conversationId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`lzs:messaging:messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.messaging.messages(conversationId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations() })
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isAuthenticated, conversationId, queryClient])

  // Server returns newest-first for pagination; reverse for display (oldest first)
  const messages = [...(rawMessages ?? [])].reverse()
  return { ...rest, data: messages }
}
