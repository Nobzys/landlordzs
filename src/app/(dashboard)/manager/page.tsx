import type { Metadata } from 'next'
import { redirect, forbidden } from 'next/navigation'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'

export const metadata: Metadata = { title: 'Property Manager Dashboard' }

export default async function PropertyManagerPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'property_manager') forbidden()
  requireActiveProfile(profile)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Property Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage properties assigned to you by owners.
        </p>
      </div>
      <div className="rounded-xl border border-dashed py-16 text-center space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Property management tools coming soon
        </p>
        <p className="text-xs text-muted-foreground/70">
          View assigned properties in <a href="/seller/listings" className="underline">Properties</a>.
        </p>
      </div>
    </div>
  )
}
