import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft, UserCheck } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { adminAssignAgent } from '@/lib/actions/properties'
import { PropertyGallery } from '@/components/properties/PropertyGallery'
import { PropertyDetails } from '@/components/properties/PropertyDetails'
import { PropertyAmenities } from '@/components/properties/PropertyAmenities'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import type { PropertyWithDetails } from '@/types/property'

interface AdminPropertyPreviewProps {
  params: Promise<{ id: string }>
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft:          { label: 'Draft',          variant: 'secondary' },
  pending_review: { label: 'Pending Review', variant: 'outline' },
  active:         { label: 'Active',         variant: 'default' },
  under_offer:    { label: 'Under Offer',    variant: 'outline' },
  sold:           { label: 'Sold',           variant: 'secondary' },
  rented:         { label: 'Rented',         variant: 'secondary' },
  off_market:     { label: 'Off Market',     variant: 'secondary' },
  expired:        { label: 'Expired',        variant: 'secondary' },
  rejected:       { label: 'Rejected',       variant: 'destructive' },
}

const PROFILE_COLS = 'id, full_name, display_name, avatar_url, phone, is_verified' as const

type AgentRow = { id: string; full_name: string | null; display_name: string | null; email: string }

async function getProperty(id: string): Promise<PropertyWithDetails | null> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('properties')
    .select('*, property_images(*), property_videos(*), property_amenities(*)')
    .eq('id', id)
    .single() as { data: Record<string, any> | null; error: any }

  if (error || !data) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: owner }, { data: agent }] = await Promise.all([
    (supabase as any).from('profiles').select(PROFILE_COLS).eq('id', data.owner_id).single() as Promise<{ data: Record<string, any> | null }>,
    data.agent_id
      ? (supabase as any).from('profiles').select(PROFILE_COLS).eq('id', data.agent_id).single() as Promise<{ data: Record<string, any> | null }>
      : Promise.resolve({ data: null }),
  ])

  return {
    ...data,
    owner: owner ?? { id: data.owner_id, full_name: null, display_name: null, avatar_url: null, phone: null, is_verified: false },
    agent: agent ?? null,
  } as unknown as PropertyWithDetails
}

async function getAgents(supabase: Awaited<ReturnType<typeof createClient>>): Promise<AgentRow[]> {
  const { data } = await (supabase as any)
    .from('profiles')
    .select('id, full_name, display_name, email')
    .eq('role', 'agent')
    .eq('account_status', 'active')
    .order('full_name', { ascending: true })
    .limit(200) as { data: AgentRow[] | null }
  return data ?? []
}

export const metadata: Metadata = { title: 'Property Preview — Admin' }

export default async function AdminPropertyPreviewPage({ params }: AdminPropertyPreviewProps) {
  const { id } = await params

  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const supabase = await createClient()

  const [property, agents] = await Promise.all([
    getProperty(id),
    getAgents(supabase),
  ])

  if (!property) notFound()

  const badge = STATUS_BADGE[property.status] ?? { label: property.status, variant: 'secondary' as const }
  const currentAgentName = (property.agent as any)?.full_name ?? (property.agent as any)?.display_name ?? null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <LinkButton variant="ghost" size="icon" className="-ml-2" href="/admin/properties">
          <ChevronLeft className="h-4 w-4" />
        </LinkButton>
        <h1 className="text-lg font-semibold">Admin Preview</h1>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      {/* Agent assignment panel */}
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Assigned Agent</h2>
          {currentAgentName && (
            <span className="text-sm text-muted-foreground">— {currentAgentName}</span>
          )}
          {!currentAgentName && (
            <span className="text-sm text-muted-foreground">— None</span>
          )}
        </div>

        <form
          action={async (fd: FormData) => {
            'use server'
            const raw = fd.get('agent_id') as string | null
            await adminAssignAgent(id, raw === '' ? null : raw)
          }}
          className="flex items-center gap-2"
        >
          <select
            name="agent_id"
            defaultValue={(property as any).agent_id ?? ''}
            className="flex-1 rounded-md border px-3 py-1.5 text-sm bg-background
              focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— No agent —</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name ?? a.display_name ?? a.email}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="outline">
            Save
          </Button>
        </form>

        {agents.length === 0 && (
          <p className="text-xs text-muted-foreground">No active agents found.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <PropertyGallery images={property.property_images} title={property.title} />
          <PropertyDetails property={property} />
          {property.property_amenities.length > 0 && (
            <PropertyAmenities amenities={property.property_amenities} />
          )}
        </div>
      </div>
    </div>
  )
}
