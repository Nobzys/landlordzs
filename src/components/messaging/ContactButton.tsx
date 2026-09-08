'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { createConversation } from '@/lib/actions/messaging'
import { queryKeys } from '@/lib/query/keys'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ContactButtonProps {
  recipientId:  string
  contextType:  string
  contextId:    string
  label?:       string
  placeholder?: string
  variant?:     'default' | 'outline' | 'secondary'
}

// Generic role-agnostic contact button.
// The caller supplies recipientId, contextType, and contextId.
// This component has no knowledge of marketplace roles — it only calls
// createConversation() and redirects to the resulting thread.
export function ContactButton({
  recipientId,
  contextType,
  contextId,
  label       = 'Send Message',
  placeholder = 'Write your message…',
  variant     = 'outline',
}: ContactButtonProps) {
  const router      = useRouter()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [message, setMessage]   = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    if (!message.trim()) return
    startTransition(async () => {
      const result = await createConversation({
        recipientId,
        contextType,
        contextId,
        initialMessage: message.trim(),
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.data?.conversationId) {
        // Invalidate the shared conversations cache before navigating so the
        // new thread appears immediately in ConversationList on arrival.
        await queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations() })
        router.push(`/messages/${result.data.conversationId}`)
      }
    })
  }

  if (!expanded) {
    return (
      <Button
        type="button"
        variant={variant}
        onClick={() => setExpanded(true)}
        className="w-full gap-2"
      >
        <MessageCircle className="h-4 w-4" />
        {label}
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={isPending}
        className="resize-none"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleSend}
          disabled={isPending || !message.trim()}
          className="flex-1 gap-2"
          size="sm"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Send
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { setExpanded(false); setMessage('') }}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
