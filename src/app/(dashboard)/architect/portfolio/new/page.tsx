import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { PortfolioForm } from '@/components/dashboard/PortfolioForm'

export const metadata: Metadata = { title: 'Add Portfolio Project — Architect' }

export default async function NewArchitectPortfolioItemPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'architect') redirect('/login')
  requireActiveProfile(profile)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/architect/portfolio"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Portfolio
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Add Portfolio Project</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Showcase your completed work to attract clients.
        </p>
      </div>

      <PortfolioForm mode="create" userId={profile.id} />
    </div>
  )
}
