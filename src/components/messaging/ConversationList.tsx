'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, Search } from 'lucide-react'
import { useConversations } from '@/hooks/messaging/useConversations'
import { useAuthStore } from '@/stores/authStore'
import { formatRelative, getInitial } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { ConversationWithDetails } from '@/lib/actions/messaging'

const CONTEXT_BADGES: Record<string, { label: string; className: string }> = {
  property:     { label: 'Property',     className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  product:      { label: 'Material',     className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  service:      { label: 'Service',      className: 'bg-violet-500/10 text-violet-700 dark:text-violet-400' },
  professional: { label: 'Professional', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
}

function ConversationItem({
  conversation,
  currentUserId,
  isActive,
}: {
  conversation: ConversationWithDetails
  currentUserId: string
  isActive: boolean
}) {
  const other = conversation.participants.find(p => p.user_id !== currentUserId)
  const displayName =
    conversation.title?.trim() ||
    other?.profile?.display_name?.trim() ||
    other?.profile?.full_name?.trim() ||
    'Unknown'

  const initial = getInitial(
    conversation.title,
    other?.profile?.display_name,
    other?.profile?.full_name,
  )

  const last = conversation.last_message
  const preview = last
    ? last.is_deleted
      ? '(Message deleted)'
      : last.content ?? ''
    : 'No messages yet'

  const timestamp = last?.created_at
    ? formatRelative(last.created_at)
    : conversation.created_at
      ? formatRelative(conversation.created_at)
      : ''

  const badge = conversation.context_type
    ? (CONTEXT_BADGES[conversation.context_type] ?? {
        label: conversation.context_type.replace(/_/g, ' '),
        className: 'bg-muted text-muted-foreground',
      })
    : null

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent',
        isActive && 'bg-accent',
      )}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary uppercase mt-0.5"
        aria-hidden="true"
      >
        {initial}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name + timestamp */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold truncate">{displayName}</p>
          {timestamp && (
            <span className="text-[11px] text-muted-foreground shrink-0">{timestamp}</span>
          )}
        </div>

        {/* Preview + unread badge */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            'text-xs truncate',
            last?.is_deleted ? 'italic text-muted-foreground' : 'text-muted-foreground',
          )}>
            {preview}
          </p>
          {conversation.unread_count > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </span>
          )}
        </div>

        {/* Context badge */}
        {badge && (
          <span className={cn(
            'inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded capitalize leading-none',
            badge.className,
          )}>
            {badge.label}
          </span>
        )}
      </div>
    </Link>
  )
}

export function ConversationList() {
  const { data: conversations, isLoading, isError } = useConversations()
  const currentUserId = useAuthStore(s => s.user?.id ?? '')
  const pathname = usePathname()
  const [query, setQuery] = useState('')

  const trimmed = query.trim().toLowerCase()
  const filtered = trimmed
    ? conversations?.filter(conv => {
        const other = conv.participants.find(p => p.user_id !== currentUserId)
        const name = (
          conv.title ||
          other?.profile?.display_name ||
          other?.profile?.full_name ||
          ''
        ).toLowerCase()
        return name.includes(trimmed)
      })
    : conversations

  return (
    <>
      {/* Search bar — sticky so it remains visible while scrolling the list */}
      <div className="sticky top-0 z-10 px-3 py-2 border-b bg-card">
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search conversations…"
            aria-label="Search conversations"
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="divide-y">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded w-2/5" />
                <div className="h-3 bg-muted rounded w-3/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && isError && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <p className="text-sm text-destructive font-medium">Failed to load conversations</p>
          <p className="text-xs text-muted-foreground mt-1">Please refresh the page</p>
        </div>
      )}

      {/* Empty state — no conversations at all */}
      {!isLoading && !isError && (!conversations || conversations.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <MessageCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
            Contact a property owner, vendor, professional, or service provider to start a conversation
          </p>
        </div>
      )}

      {/* Conversation list */}
      {!isLoading && !isError && conversations && conversations.length > 0 && (
        filtered && filtered.length > 0 ? (
          <div className="divide-y">
            {filtered.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                currentUserId={currentUserId}
                isActive={pathname === `/messages/${conv.id}`}
              />
            ))}
          </div>
        ) : (
          /* No search results */
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-sm text-muted-foreground">No conversations match your search</p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs text-primary hover:underline mt-1.5"
            >
              Clear search
            </button>
          </div>
        )
      )}
    </>
  )
}
