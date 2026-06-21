import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Mail, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPublicProfileBySlug } from '@/lib/data/publicProfile'
import { PublicProfileView } from '@/components/trust/PublicProfileView'

interface PublicProfileBySlugPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PublicProfileBySlugPageProps): Promise<Metadata> {
  const { slug } = await params
  const profile = await getPublicProfileBySlug(slug)
  if (!profile) return { title: 'Profile Not Found' }

  const name = profile.display_name?.trim() || profile.full_name?.trim() || 'LANDLORDZS user'
  return { title: `${name} | LANDLORDZS`, description: profile.bio?.slice(0, 160) }
}

export default async function PublicProfileBySlugPage({ params }: PublicProfileBySlugPageProps) {
  const { slug } = await params
  const profile = await getPublicProfileBySlug(slug)
  if (!profile) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === profile.id

  // email/phone visibility is enforced here only, not in the shared
  // PublicProfileView/getPublicProfile used by /sellers/[id] and
  // /professionals/[id] — those routes never show contact details and
  // must keep not showing them regardless of this page's toggles.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contact } = await (supabase as any)
    .from('profiles_safe')
    .select('email, phone, email_visibility, phone_visibility')
    .eq('id', profile.id)
    .maybeSingle()

  const showEmail = isOwnProfile || (contact?.email_visibility && contact?.email)
  const showPhone = isOwnProfile || (contact?.phone_visibility && contact?.phone)

  return (
    <>
      <PublicProfileView data={profile} viewerId={user?.id ?? null} />
      {(showEmail || showPhone) && (
        <div className="max-w-4xl mx-auto px-4 -mt-2 pb-8 flex gap-4 flex-wrap text-sm">
          {showEmail && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-blue-700 hover:underline">
              <Mail className="h-3.5 w-3.5" />{contact.email}
            </a>
          )}
          {showPhone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-blue-700 hover:underline">
              <Phone className="h-3.5 w-3.5" />{contact.phone}
            </a>
          )}
        </div>
      )}
    </>
  )
}
