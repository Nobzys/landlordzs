import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPublicProfile } from '@/lib/data/publicProfile'
import { PublicProfileView } from '@/components/trust/PublicProfileView'

interface SellerProfilePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: SellerProfilePageProps): Promise<Metadata> {
  const { id } = await params
  const profile = await getPublicProfile(id)
  if (!profile) return { title: 'Profile Not Found' }

  const name = profile.display_name?.trim() || profile.full_name?.trim() || 'LANDLORDZS Seller'
  return { title: `${name} | LANDLORDZS`, description: profile.bio?.slice(0, 160) }
}

export default async function SellerProfilePage({ params }: SellerProfilePageProps) {
  const { id } = await params
  const profile = await getPublicProfile(id)
  if (!profile || profile.capabilities.publicProfileGroup !== 'sellers') notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <PublicProfileView data={profile} viewerId={user?.id ?? null} />
}
