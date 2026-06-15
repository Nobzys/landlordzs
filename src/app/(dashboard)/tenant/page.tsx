import type { Metadata } from 'next'
import { redirect, forbidden } from 'next/navigation'
import { getServerProfile } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Find Rentals' }

export default async function TenantPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'tenant') forbidden()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find Rentals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse available rental properties across Cameroon.
        </p>
      </div>
      <div className="rounded-xl border border-dashed py-16 text-center space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Rental search coming soon</p>
        <p className="text-xs text-muted-foreground/70">
          Browse <a href="/properties" className="underline">all properties</a> in the meantime.
        </p>
      </div>
    </div>
  )
}
