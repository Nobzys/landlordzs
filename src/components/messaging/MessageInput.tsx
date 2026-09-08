'use client'

import { useState, useTransition, useRef } from 'react'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { sendMessage } from '@/lib/actions/messaging'
import { queryKeys } from '@/lib/query/keys'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface MessageInputProps {
  conversationId: string
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [content, setContent] = useState('')
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSend() {
    const trimmed = content.trim()
    if (!trimmed || isPending) return

    startTransition(async () => {
      const result = await sendMessage({ conversationId, content: trimmed })
      if (result.error) {
        toast.error(result.error)
        return
      }
      setContent('')
      queryClient.invalidateQueries({ queryKey: queryKeys.messaging.messages(conversationId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations() })
      textareaRef.current?.focus()
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="shrink-0 flex items-end gap-2 px-4 py-3 border-t bg-card">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
        rows={1}
        disabled={isPending}
        className="flex-1 min-h-[40px] max-h-[120px] resize-none"
      />
      <Button
        size="icon"
        onClick={handleSend}
        disabled={!content.trim() || isPending}
        aria-label="Send message"
        className="shrink-0 mb-0.5"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
