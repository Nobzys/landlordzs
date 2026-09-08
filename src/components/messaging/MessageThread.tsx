'use client'

import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useMessages } from '@/hooks/messaging/useMessages'
import { useAuthStore } from '@/stores/authStore'
import { deleteMessage } from '@/lib/actions/messaging'
import { queryKeys } from '@/lib/query/keys'
import { formatRelative, getInitial } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { MessageWithDetails } from '@/lib/actions/messaging'

function MessageBubble({
  message,
  isOwn,
  onDelete,
}: {
  message: MessageWithDetails
  isOwn: boolean
  onDelete: (id: string) => void
}) {
  const isDeleted = message.is_deleted

  return (
    <div className={cn('group flex gap-2 items-end', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar (other participant only) */}
      {!isOwn && (
        <div
          className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary shrink-0 mb-0.5"
          aria-hidden="true"
        >
          {getInitial(
            message.sender?.display_name,
            message.sender?.full_name,
          )}
        </div>
      )}

      <div className={cn('flex flex-col gap-1 max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
        {/* Reply-to preview */}
        {message.reply_to && !isDeleted && (
          <div className={cn(
            'text-xs px-2.5 py-1.5 rounded-lg border-l-2 max-w-full truncate',
            isOwn
              ? 'border-primary/50 bg-primary/5 text-primary/70'
              : 'border-muted-foreground/30 bg-muted text-muted-foreground',
          )}>
            {message.reply_to.is_deleted
              ? '(Message deleted)'
              : message.reply_to.content ?? ''}
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            'relative px-3 py-2 rounded-2xl text-sm leading-relaxed break-words',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm',
            isDeleted && 'italic opacity-60',
          )}
        >
          {isDeleted ? '(Message deleted)' : message.content}

          {/* Delete button — own messages only, not-deleted */}
          {isOwn && !isDeleted && (
            <button
              onClick={() => onDelete(message.id)}
              className="absolute -top-2 -left-7 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              aria-label="Delete message"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground px-1">
          {formatRelative(message.created_at)}
        </span>
      </div>
    </div>
  )
}

interface MessageThreadProps {
  conversationId: string
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const { data: messages, isLoading } = useMessages(conversationId)
  const currentUserId = useAuthStore(s => s.user?.id ?? '')
  const queryClient = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages?.length])

  async function handleDelete(messageId: string) {
    await deleteMessage(messageId)
    queryClient.invalidateQueries({ queryKey: queryKeys.messaging.messages(conversationId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations() })
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-muted-foreground animate-pulse">Loading messages…</div>
      </div>
    )
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Start the conversation</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-3">
      {messages.map(msg => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isOwn={msg.sender_id === currentUserId}
          onDelete={handleDelete}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
