import type { Metadata } from 'next'
import { MessageCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Messages' }

// Auth is handled by (dashboard)/layout.tsx.
// ConversationList is rendered once by MessagesShell (messages/layout.tsx).
// On mobile, MessagesShell shows the sidebar full-width and hides this panel
// entirely, so this page renders the desktop empty state only.
export default function MessagesPage() {
  return (
    <div className="hidden lg:flex flex-1 flex-col items-center justify-center gap-4 p-8 bg-muted/20">
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
        <MessageCircle className="h-8 w-8 text-primary/50" />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold">Select a conversation</p>
        <p className="text-xs text-muted-foreground max-w-[220px]">
          Choose a conversation from the sidebar to view your messages
        </p>
      </div>
    </div>
  )
}
