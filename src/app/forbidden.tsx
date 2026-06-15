import Link from 'next/link'
import { ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldOff className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">403 — Forbidden</h1>
        <p className="text-muted-foreground max-w-sm">
          You don&apos;t have permission to access this page.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/account/profile">Go to my profile</Link>
      </Button>
    </div>
  )
}
