import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { PropertyForm } from '@/components/properties/forms/PropertyForm'
import { canCreateProperty } from '@/lib/roles'

export const metadata: Metadata = { title: 'New Listing' }

export default async function NewListingPage() {
  const profile = await getServerProfile()
  if (!profile || !canCreateProperty(profile.role)) {
    redirect('/login')
  }
  requireActiveProfile(profile)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Create New Listing</h1>
      <PropertyForm mode="create" userId={profile.id} />
    </div>
  )
}
