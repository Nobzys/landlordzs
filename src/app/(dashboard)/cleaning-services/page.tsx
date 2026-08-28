import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'

export const metadata: Metadata = { title: 'Cleaning Services Dashboard' }

export default async function CleaningServicesDashboardPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'cleaning_services') redirect('/login')
  requireActiveProfile(profile)

  const name = profile.display_name ?? profile.full_name ?? 'Professional'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Sparkles className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Cleaning Services Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {name}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-12 text-center space-y-2">
        <Sparkles className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
        <p className="font-medium">Coming soon</p>
        <p className="text-sm text-muted-foreground">
          Your cleaning services management tools will appear here.
        </p>
      </div>
    </div>
  )
}
