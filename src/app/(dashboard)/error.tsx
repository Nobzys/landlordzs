'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
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
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <p className="text-4xl font-extrabold text-destructive mb-3">Error</p>
        <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mb-6">
          This page encountered an unexpected error. Try refreshing or navigating back.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Go home
          </Link>
        </div>
        {error.digest && (
          <p className="mt-3 text-xs text-muted-foreground">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
