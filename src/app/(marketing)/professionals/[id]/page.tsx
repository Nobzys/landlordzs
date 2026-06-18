import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPublicProfile } from '@/lib/data/publicProfile'
import { PublicProfileView } from '@/components/trust/PublicProfileView'

interface ProfessionalProfilePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProfessionalProfilePageProps): Promise<Metadata> {
  const { id } = await params
  const profile = await getPublicProfile(id)
  if (!profile) return { title: 'Profile Not Found' }

  const name = profile.display_name?.trim() || profile.full_name?.trim() || 'LANDLORDZS Professional'
  return { title: `${name} | LANDLORDZS`, description: profile.bio?.slice(0, 160) }
}

export default async function ProfessionalProfilePage({ params }: ProfessionalProfilePageProps) {
  const { id } = await params
  const profile = await getPublicProfile(id)
  if (!profile || profile.capabilities.publicProfileGroup !== 'professionals') notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <PublicProfileView data={profile} viewerId={user?.id ?? null} />
}
