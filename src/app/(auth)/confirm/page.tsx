import type { Metadata } from 'next'
import Link from 'next/link'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmEmailForm } from '@/components/auth/ConfirmEmailForm'
import type { ConfirmEmailInput } from '@/lib/validations/auth'

export const metadata: Metadata = {
  title: 'Confirm Your Email — LANDLORDZS',
}

interface ConfirmPageProps {
  searchParams: Promise<{ token_hash?: string; type?: string; email?: string }>
}

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const params     = await searchParams
  const tokenHash   = params.token_hash
  const type        = params.type
  const email       = params.email ?? null

  if (!tokenHash || !type) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <XCircle className="text-red-600" size={32} />
        </div>
        <h1 className="text-2xl font-bold">Invalid confirmation link</h1>
        <p className="text-sm text-muted-foreground">
          This link is missing required information. Please request a new
          verification link.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Back to Sign In</Link>
        </Button>
      </div>
    )
  }

  const input: ConfirmEmailInput = { token_hash: tokenHash, type: type as ConfirmEmailInput['type'] }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Confirm your email</h1>
      </div>
      <ConfirmEmailForm input={input} email={email} />
    </div>
  )
}
