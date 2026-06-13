import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4 py-12">
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="text-2xl font-extrabold tracking-tight text-primary">
          LANDLORDZS
        </span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl border bg-background p-8 shadow-lg">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} LANDLORDZS &mdash; Cameroon&apos;s Real Estate Marketplace
      </p>
    </div>
  )
}
