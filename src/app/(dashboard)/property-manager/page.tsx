import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { KeyRound, Clock } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'

export const metadata: Metadata = { title: 'Dashboard — Property Manager' }

export default async function PropertyManagerDashboardPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'property_manager') redirect('/login')
  requireActiveProfile(profile)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <KeyRound className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Property Manager Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {profile.display_name ?? profile.full_name ?? 'Manager'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-8 text-center space-y-3">
        <Clock className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
        <p className="font-medium">Dashboard coming soon</p>
        <p className="text-sm text-muted-foreground">
          Property management features — assigned properties, tenant management, and rent collection — are currently in development.
        </p>
      </div>
    </div>
  )
}
