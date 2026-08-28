import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Wrench } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'

export const metadata: Metadata = { title: 'Maintenance Dashboard' }

export default async function MaintenanceDashboardPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'maintenance') redirect('/login')
  requireActiveProfile(profile)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Wrench className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Maintenance Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage your maintenance requests and work orders
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-12 text-center space-y-2">
        <Wrench className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
        <p className="font-medium">Coming soon</p>
        <p className="text-sm text-muted-foreground">
          Work orders and maintenance requests will appear here.
        </p>
      </div>
    </div>
  )
}
