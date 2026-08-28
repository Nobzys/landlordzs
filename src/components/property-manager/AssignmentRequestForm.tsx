'use client'

import { useState, useTransition } from 'react'
import { UserCheck, Search, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  findPropertyManagerByEmail,
  requestPropertyAssignment,
  type PMResult,
} from '@/lib/actions/assignments'

interface Props {
  propertyId: string
}

export function AssignmentRequestForm({ propertyId }: Props) {
  const [email, setEmail]           = useState('')
  const [found, setFound]           = useState<PMResult | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [sendError, setSendError]   = useState<string | null>(null)
  const [sent, setSent]             = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setFound(null)
    setLookupError(null)
    setSendError(null)
    startTransition(async () => {
      const result = await findPropertyManagerByEmail(email)
      if (result.error) {
        setLookupError(result.error)
      } else {
        setFound(result.data ?? null)
      }
    })
  }

  function handleSendRequest() {
    if (!found) return
    setSendError(null)
    startTransition(async () => {
      const result = await requestPropertyAssignment(propertyId, found.id)
      if (result.error) {
        setSendError(result.error)
      } else {
        setSent(true)
      }
    })
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4 flex items-start gap-3">
        <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-green-800 dark:text-green-200">Request sent</p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
            {found?.display_name ?? found?.full_name ?? 'The Property Manager'} will receive your request and can accept or decline.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Step 1: email lookup */}
      <form onSubmit={handleLookup} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={e => { setEmail(e.target.value); setFound(null); setLookupError(null) }}
          placeholder="Property Manager's email address"
          className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm
                     ring-offset-background placeholder:text-muted-foreground
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" variant="outline" size="default" disabled={isPending || !email.trim()}>
          <Search className="h-4 w-4 mr-2" />
          Find
        </Button>
      </form>

      {lookupError && (
        <p className="text-sm text-destructive">{lookupError}</p>
      )}

      {/* Step 2: confirm and send */}
      {found && (
        <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {found.display_name ?? found.full_name ?? 'Property Manager found'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Send a management request to this Property Manager?
          </p>
          {sendError && (
            <p className="text-sm text-destructive">{sendError}</p>
          )}
          <div className="flex gap-2">
            <Button
              onClick={handleSendRequest}
              disabled={isPending}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Request
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFound(null); setEmail('') }}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
