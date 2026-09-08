import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { getConversations, markConversationRead } from '@/lib/actions/messaging'
import { MessageThread } from '@/components/messaging/MessageThread'
import { MessageInput } from '@/components/messaging/MessageInput'

export const metadata: Metadata = { title: 'Conversation' }

const CONTEXT_LABELS: Record<string, string> = {
  property:     'Property inquiry',
  product:      'Material inquiry',
  service:      'Service inquiry',
  professional: 'Professional contact',
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  const { id: conversationId } = await params

  // Participation check — getConversations only returns conversations for the
  // current user; not finding the id here means they are not a participant.
  const conversations = await getConversations()
  const conversation = conversations.find(c => c.id === conversationId)
  if (!conversation) redirect('/messages')

  const otherParticipant = conversation.participants.find(
    p => p.user_id !== profile.id,
  )
  const conversationName =
    conversation.title?.trim() ||
    otherParticipant?.profile?.display_name?.trim() ||
    otherParticipant?.profile?.full_name?.trim() ||
    'Conversation'

  const contextLabel = conversation.context_type
    ? (CONTEXT_LABELS[conversation.context_type] ??
        `${conversation.context_type.replace(/_/g, ' ')} conversation`)
    : null

  // When this conversation is linked to a property, fetch the property title
  // so the thread header can display it as a link back to the listing.
  let contextProperty: { id: string; title: string } | null = null
  if (conversation.context_type === 'property' && conversation.context_id) {
    const sb = await createClient()
    const { data } = await sb
      .from('properties')
      .select('id, title')
      .eq('id', conversation.context_id)
      .maybeSingle()
    contextProperty = data ?? null
  }

  await markConversationRead(conversationId)

  // The layout (messages/layout.tsx) provides the flex-col height shell.
  // Render as a fragment so these elements become direct flex children.
  return (
    <>
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
        {/* Back arrow — mobile only; desktop has the sidebar for navigation */}
        <Link
          href="/messages"
          className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to messages"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">{conversationName}</h1>
          {contextProperty ? (
            <p className="text-xs text-muted-foreground">
              Re:{' '}
              <Link
                href={`/properties/${contextProperty.id}`}
                className="underline underline-offset-2 hover:no-underline"
              >
                {contextProperty.title}
              </Link>
            </p>
          ) : contextLabel ? (
            <p className="text-xs text-muted-foreground">{contextLabel}</p>
          ) : null}
        </div>
      </div>

      {/* Scrollable message area — flex-1 fills remaining space in parent flex-col */}
      <MessageThread conversationId={conversationId} />

      {/* Fixed-bottom composer */}
      <MessageInput conversationId={conversationId} />
    </>
  )
}
