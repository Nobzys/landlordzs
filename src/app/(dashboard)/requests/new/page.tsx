import type { Metadata } from 'next'
import { notFound, forbidden } from 'next/navigation'
import Image from 'next/image'
import { MapPin } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { canRequestQuotes } from '@/lib/roles'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'
import { CTA_LABEL_BY_ROLE } from '@/types/service-request'
import { RequestForm } from './RequestForm'

export const metadata: Metadata = { title: 'New Service Request' }

interface SearchParams { providerId?: string }

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile) forbidden()
  if (!canRequestQuotes(profile!.role)) forbidden()

  const { providerId } = await searchParams
  if (!providerId) notFound()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: providerRaw } = await (supabase as any)
    .from('profiles')
    .select('id, full_name, display_name, avatar_url, city, role, account_status, slug')
    .eq('id', providerId)
    .eq('account_status', 'active')
    .maybeSingle() as {
      data: {
        id: string; full_name: string | null; display_name: string | null
        avatar_url: string | null; city: string | null; role: string
        account_status: string; slug: string | null
      } | null
    }

  if (!providerRaw) notFound()

  const providerName = providerRaw.display_name ?? providerRaw.full_name ?? 'Professional'
  const roleLabel    = ROLE_LABELS[providerRaw.role as UserRole] ?? providerRaw.role
  const ctaLabel     = CTA_LABEL_BY_ROLE[providerRaw.role] ?? 'Request Service'
  const initial      = providerName.charAt(0).toUpperCase()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{ctaLabel}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send a service request directly to this professional.
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
        <div className="relative h-14 w-14 rounded-full bg-muted shrink-0 overflow-hidden flex items-center justify-center font-semibold text-xl">
          {providerRaw.avatar_url ? (
            <Image
              src={providerRaw.avatar_url}
              alt={providerName}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div>
          <p className="font-semibold text-sm">{providerName}</p>
          <p className="text-xs text-muted-foreground capitalize">{roleLabel}</p>
          {providerRaw.city && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 capitalize">
              <MapPin className="h-3 w-3" />
              {providerRaw.city}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <RequestForm
          provider={{
            id:         providerRaw.id,
            name:       providerName,
            role:       providerRaw.role,
            avatar_url: providerRaw.avatar_url,
          }}
        />
      </div>
    </div>
  )
}
