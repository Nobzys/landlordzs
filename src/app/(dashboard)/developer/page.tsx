import type { Metadata } from 'next'
import { redirect, forbidden } from 'next/navigation'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { LinkButton } from '@/components/ui/link-button'
import { Plus } from 'lucide-react'

export const metadata: Metadata = { title: 'Developer Dashboard' }

export default async function DeveloperPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'developer') forbidden()
  requireActiveProfile(profile)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Developer Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your development projects and property listings.
          </p>
        </div>
        <LinkButton href="/seller/listings/new" size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          New Listing
        </LinkButton>
      </div>
      <div className="rounded-xl border border-dashed py-16 text-center space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Development project management coming soon
        </p>
        <p className="text-xs text-muted-foreground/70">
          Use <a href="/seller/listings" className="underline">My Listings</a> to manage properties.
        </p>
      </div>
    </div>
  )
}
