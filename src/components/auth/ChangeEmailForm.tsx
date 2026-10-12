'use client'

import { useState, useTransition } from 'react'
import { Mail, CheckCircle2 } from 'lucide-react'
import { updateEmail } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Props {
  currentEmail: string
}

export function ChangeEmailForm({ currentEmail }: Props) {
  const [newEmail,    setNewEmail]    = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null)
  const [isPending,   startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    setSuccessMsg(null)
    startTransition(async () => {
      const res = await updateEmail(newEmail)
      if (res.error) {
        setServerError(res.error)
      } else {
        setSuccessMsg(res.data?.message ?? 'Confirmation email sent.')
        setNewEmail('')
      }
    })
  }

  return (
    <div className="rounded-xl border p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Change Email Address</h2>
      </div>

      <p className="text-xs text-muted-foreground">
        Current: <span className="font-medium text-foreground">{currentEmail}</span>
      </p>

      {successMsg && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMsg}</AlertDescription>
        </Alert>
      )}

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="new-email" className="text-xs font-medium">
            New email address
          </label>
          <Input
            id="new-email"
            type="email"
            autoComplete="email"
            placeholder="new@example.com"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            disabled={isPending}
          />
        </div>
        <Button type="submit" size="sm" disabled={isPending || !newEmail.trim()}>
          {isPending ? 'Sending…' : 'Send confirmation email'}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        A confirmation link will be sent to the new address. Your current email remains active until you click the link.
      </p>
    </div>
  )
}
