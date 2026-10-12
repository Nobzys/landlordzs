'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <p className="text-5xl font-extrabold text-destructive mb-4">500</p>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-8">
          An unexpected error occurred. Our team has been notified. Please try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border px-5 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Go to homepage
          </a>
        </div>
        {error.digest && (
          <p className="mt-4 text-xs text-muted-foreground">Error ID: {error.digest}</p>
        )}
        <p className="mt-6 text-xs text-muted-foreground">
          <span className="font-extrabold tracking-tight text-primary">LANDLORD</span>
          <span className="font-extrabold tracking-tight text-destructive">ZS</span>
        </p>
      </div>
    </div>
  )
}
