import type { Metadata } from 'next'
import { redirect, forbidden } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { ProjectForm } from '@/components/portfolio/ProjectForm'
import { Button } from '@/components/ui/button'
import { canManagePortfolio } from '@/lib/roles'

export const metadata: Metadata = { title: 'Add Portfolio Project' }

export default async function NewProjectPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (!canManagePortfolio(profile.role)) forbidden()
  requireActiveProfile(profile)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/account/portfolio">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Project</h1>
          <p className="text-sm text-muted-foreground">
            Create a project — add images after saving
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <ProjectForm />
      </div>
    </div>
  )
}
