import type { Metadata } from 'next'
import { redirect, forbidden } from 'next/navigation'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'

export const metadata: Metadata = { title: 'Maintenance Dashboard' }

export default async function MaintenancePage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'maintenance') forbidden()
  requireActiveProfile(profile)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Maintenance Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your cleaning, repair, and maintenance service listings.
        </p>
      </div>
      <div className="rounded-xl border border-dashed py-16 text-center space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Service listing management coming soon
        </p>
        <p className="text-xs text-muted-foreground/70">
          Complete your <a href="/account/profile" className="underline">profile</a> to appear in searches.
        </p>
      </div>
    </div>
  )
}
