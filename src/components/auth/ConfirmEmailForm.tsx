'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MailCheck, XCircle } from 'lucide-react'
import { confirmEmail, resendVerificationEmail } from '@/lib/actions/auth'
import type { ConfirmEmailInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ConfirmEmailFormProps {
  input: ConfirmEmailInput
  email: string | null
}

// Deliberately NOT auto-submitted on mount. Automated email-security
// scanners issue a plain GET against this page and stop there — they don't
// click buttons. The token is only ever consumed by confirmEmail(), which
// only fires from this onClick handler, so a real human click is required.
export function ConfirmEmailForm({ input, email }: ConfirmEmailFormProps) {
  const router = useRouter()
  const [error,     setError]     = useState<string | null>(null)
  const [resent,    setResent]    = useState(false)
  const [isPending, startTransition] = useTransition()

  const onConfirm = () => {
    setError(null)
    startTransition(async () => {
      const result = await confirmEmail(input)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.push(result?.data?.redirectTo ?? '/onboarding')
      router.refresh()
    })
  }

  const onResend = () => {
    if (!email) return
    startTransition(async () => {
      await resendVerificationEmail(email)
      setResent(true)
    })
  }

  if (error) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <XCircle className="text-red-600" size={32} />
        </div>
        <h2 className="text-xl font-semibold">Confirmation failed</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        {email && !resent && (
          <Button className="w-full" onClick={onResend} disabled={isPending}>
            Send a new verification link
          </Button>
        )}
        {resent && (
          <Alert>
            <AlertDescription>
              A new verification link has been sent to {email}.
            </AlertDescription>
          </Alert>
        )}
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to Sign In</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <MailCheck className="text-blue-600" size={28} />
      </div>
      <p className="text-sm text-muted-foreground">
        Click below to confirm your email address and activate your account.
      </p>
      <Button className="w-full" onClick={onConfirm} disabled={isPending}>
        {isPending ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Confirming…
          </span>
        ) : (
          'Confirm my email'
        )}
      </Button>
    </div>
  )
}
