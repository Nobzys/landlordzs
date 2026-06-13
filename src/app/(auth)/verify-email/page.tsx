import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Email Verification — LANDLORDZS',
}

interface VerifyEmailPageProps {
  searchParams: Promise<{ verified?: string; error?: string }>
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params   = await searchParams
  const verified = params.verified === 'true'
  const hasError = !!params.error

  if (verified) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="text-green-600" size={32} />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Email verified!</h1>
          <p className="text-sm text-muted-foreground">
            Your email has been confirmed. Let&apos;s set up your profile.
          </p>
        </div>
        <Link href="/onboarding">
          <Button className="w-full">Continue to Setup</Button>
        </Link>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <XCircle className="text-red-600" size={32} />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Verification failed</h1>
          <p className="text-sm text-muted-foreground">
            The verification link may have expired or already been used.
          </p>
        </div>
        <div className="space-y-2">
          <Link href="/register">
            <Button className="w-full">Create a new account</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="w-full">Back to Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Default: awaiting verification
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <span className="text-3xl">✉️</span>
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent you a verification link. Click it to activate your account.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Didn&apos;t receive it?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Try registering again
        </Link>
        .
      </p>
    </div>
  )
}
