'use client'

import { useSelectedLayoutSegment } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ConversationList } from './ConversationList'

/**
 * Client shell for the /messages route group.
 * ConversationList is rendered HERE and only here — never in the index page —
 * so there is exactly one useConversations() instance at all times.
 *
 * Layout rules:
 *   Desktop (lg+):  sidebar always visible (w-80) + main panel always visible (flex-1)
 *   Mobile, /messages:       sidebar full-width, main panel hidden
 *   Mobile, /messages/[id]:  sidebar hidden, main panel full-width
 */
export function MessagesShell({ children }: { children: React.ReactNode }) {
  // Returns the active child segment of the messages layout:
  //   /messages        → null
  //   /messages/[id]   → the conversation ID string
  const segment = useSelectedLayoutSegment()
  const hasOpenConversation = !!segment

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen overflow-hidden">

      {/* ── Conversation sidebar ── */}
      <aside
        className={cn(
          'flex flex-col border-r bg-card shrink-0',
          hasOpenConversation
            // Conversation open: sidebar hidden on mobile, normal on desktop
            ? 'hidden lg:flex lg:w-80'
            // No conversation: sidebar full-width on mobile, normal on desktop
            : 'flex w-full lg:w-80',
        )}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b shrink-0">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <ConversationList />
        </div>
      </aside>

      {/* ── Main conversation panel ── */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 overflow-hidden',
          hasOpenConversation
            // Conversation open: always visible
            ? 'flex'
            // No conversation: hidden on mobile (sidebar shown instead), visible on desktop
            : 'hidden lg:flex',
        )}
      >
        {children}
      </div>
    </div>
  )
}
