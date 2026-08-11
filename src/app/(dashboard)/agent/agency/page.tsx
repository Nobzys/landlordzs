import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Building2, CheckCircle, Shield } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { Badge } from '@/components/ui/badge'
import { AgencyForms } from '@/components/agent/AgencyForms'

export const metadata: Metadata = { title: 'My Agency — Agent' }

type AgencyRow = {
  id:               string
  owner_id:         string
  name:             string
  slug:             string
  city:             string | null
  phone:            string | null
  email:            string | null
  description:      string | null
  license_number:   string | null
  license_verified: boolean
  listing_count:    number
  is_active:        boolean
}

export default async function AgencyPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'agent') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agentProfile } = await (supabase as any)
    .from('agent_profiles')
    .select('agency_id, commission_rate')
    .eq('id', profile.id)
    .maybeSingle() as { data: { agency_id: string | null; commission_rate: number } | null }

  let agency: AgencyRow | null = null
  if (agentProfile?.agency_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('agencies')
      .select('id, owner_id, name, slug, city, phone, email, description, license_number, license_verified, listing_count, is_active')
      .eq('id', agentProfile.agency_id)
      .maybeSingle() as { data: AgencyRow | null }
    agency = data
  }

  const isOwner = agency ? agency.owner_id === profile.id : false

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">My Agency</h1>
          <p className="text-sm text-muted-foreground">
            {agency ? agency.name : 'No agency affiliation yet'}
          </p>
        </div>
      </div>

      {/* If affiliated — show agency info */}
      {agency && (
        <div className="rounded-xl border p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{agency.name}</p>
              {agency.city && (
                <p className="text-sm text-muted-foreground capitalize">{agency.city}</p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {agency.license_verified && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Licensed
                </Badge>
              )}
              {isOwner && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Owner
                </Badge>
              )}
              {!agency.is_active && (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            {agency.phone && <p>Phone: <span className="text-foreground">{agency.phone}</span></p>}
            {agency.email && <p>Email: <span className="text-foreground">{agency.email}</span></p>}
            {agency.license_number && <p>License: <span className="text-foreground font-mono text-xs">{agency.license_number}</span></p>}
            <p>Listings: <span className="text-foreground">{agency.listing_count}</span></p>
          </div>

          {agency.description && (
            <p className="text-sm text-muted-foreground italic">{agency.description}</p>
          )}
        </div>
      )}

      {/* Forms: update (owner), join/create (no agency), leave (member) */}
      <AgencyForms
        profileId={profile.id}
        agency={agency
          ? {
              id:             agency.id,
              name:           agency.name,
              city:           agency.city,
              phone:          agency.phone,
              email:          agency.email,
              description:    agency.description,
              license_number: agency.license_number,
            }
          : null}
        isOwner={isOwner}
      />
    </div>
  )
}
