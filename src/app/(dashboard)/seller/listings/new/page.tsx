import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/supabase/server'
import { PropertyForm } from '@/components/properties/forms/PropertyForm'

export const metadata: Metadata = { title: 'New Listing' }

export default async function NewListingPage() {
  const profile = await getServerProfile()
  if (!profile || !['seller', 'agent', 'admin'].includes(profile.role)) {
    redirect('/login')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Create New Listing</h1>
      <PropertyForm mode="create" userId={profile.id} />
    </div>
  )
}
