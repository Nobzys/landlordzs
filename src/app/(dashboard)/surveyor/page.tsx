import type { Metadata } from 'next'
import { redirect, forbidden } from 'next/navigation'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { LinkButton } from '@/components/ui/link-button'
import { FolderOpen } from 'lucide-react'

export const metadata: Metadata = { title: 'Surveyor Dashboard' }

export default async function SurveyorPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'surveyor') forbidden()
  requireActiveProfile(profile)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Surveyor Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your valuation services and portfolio projects.
          </p>
        </div>
        <LinkButton href="/account/portfolio" variant="outline" size="sm">
          <FolderOpen className="h-4 w-4 mr-1.5" />
          Portfolio
        </LinkButton>
      </div>
      <div className="rounded-xl border border-dashed py-16 text-center space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Valuation request management coming soon
        </p>
        <p className="text-xs text-muted-foreground/70">
          Showcase your work by adding projects to your <a href="/account/portfolio" className="underline">portfolio</a>.
        </p>
      </div>
    </div>
  )
}
