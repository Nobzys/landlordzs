import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/supabase/server'
import { FavoritesGrid } from '@/components/properties/FavoritesGrid'

export const metadata: Metadata = { title: 'Saved Properties' }

export default async function FavoritesPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Saved Properties</h1>
      <FavoritesGrid />
    </div>
  )
}
