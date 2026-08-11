import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, Mail, Phone, MessageSquare, ExternalLink } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { Badge } from '@/components/ui/badge'
import { formatRelative } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Clients — Agent' }

type InquiryRow = {
  id:          string
  name:        string
  email:       string
  phone:       string | null
  message:     string
  is_read:     boolean
  replied_at:  string | null
  created_at:  string
  property_id: string
  sender_id:   string | null
  properties: {
    id:    string
    title: string
    slug:  string
  } | null
}

// Deduplicate: one card per unique requester (email) with latest inquiry info
type ClientSummary = {
  email:        string
  name:         string
  phone:        string | null
  sender_id:    string | null
  inquiryCount: number
  lastContact:  string
  properties:   { id: string; title: string; slug: string }[]
  hasUnreplied: boolean
}

export default async function AgentClientsPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'agent') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  // Step 1: get property IDs owned by this agent
  const { data: propData } = await supabase
    .from('properties')
    .select('id')
    .eq('owner_id', profile.id) as { data: { id: string }[] | null }

  const propIds = (propData ?? []).map(p => p.id)

  // Step 2: fetch inquiries for those properties
  let inquiries: InquiryRow[] = []
  if (propIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('property_inquiries')
      .select(`
        id, name, email, phone, message, is_read, replied_at, created_at,
        property_id, sender_id,
        properties (id, title, slug)
      `)
      .in('property_id', propIds)
      .order('created_at', { ascending: false }) as { data: InquiryRow[] | null }
    inquiries = data ?? []
  }

  // Aggregate into client summaries keyed by email
  const clientMap = new Map<string, ClientSummary>()
  for (const inq of inquiries) {
    const existing = clientMap.get(inq.email)
    const prop = inq.properties
    if (existing) {
      existing.inquiryCount += 1
      if (prop && !existing.properties.find(p => p.id === prop.id)) {
        existing.properties.push(prop)
      }
      if (!inq.replied_at) existing.hasUnreplied = true
    } else {
      clientMap.set(inq.email, {
        email:        inq.email,
        name:         inq.name,
        phone:        inq.phone ?? null,
        sender_id:    inq.sender_id,
        inquiryCount: 1,
        lastContact:  inq.created_at,
        properties:   prop ? [prop] : [],
        hasUnreplied: !inq.replied_at,
      })
    }
  }

  const clients = Array.from(clientMap.values())

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {clients.length} unique {clients.length === 1 ? 'requester' : 'requesters'} · {inquiries.length} total {inquiries.length === 1 ? 'inquiry' : 'inquiries'}
          </p>
        </div>
      </div>

      {propIds.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">No listings yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create a listing to start receiving client inquiries.</p>
          <Link
            href="/seller/listings/new"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary hover:underline"
          >
            Create a listing
          </Link>
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">No inquiries yet</p>
          <p className="text-sm text-muted-foreground mt-1">Client inquiries on your listings will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border divide-y overflow-hidden">
          {clients.map((client) => (
            <div key={client.email} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase">
                    {client.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{client.name}</p>
                    <a
                      href={`mailto:${client.email}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3" />
                      {client.email}
                    </a>
                    {client.phone && (
                      <a
                        href={`tel:${client.phone}`}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
                      >
                        <Phone className="h-3 w-3" />
                        {client.phone}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {client.hasUnreplied && (
                    <Badge variant="secondary" className="text-xs">Needs reply</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(client.lastContact)}
                  </span>
                </div>
              </div>

              {/* Properties inquired about */}
              {client.properties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {client.properties.map(prop => (
                    <Link
                      key={prop.id}
                      href={`/properties/${prop.slug}`}
                      className="inline-flex items-center gap-1 text-xs rounded-md bg-muted px-2 py-1 hover:bg-muted/70 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate max-w-[160px]">{prop.title}</span>
                    </Link>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {client.inquiryCount} {client.inquiryCount === 1 ? 'inquiry' : 'inquiries'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Link to full inquiries view */}
      {inquiries.length > 0 && (
        <div className="text-center">
          <Link
            href="/seller/inquiries"
            className="text-sm text-primary hover:underline"
          >
            View all inquiries with messages →
          </Link>
        </div>
      )}
    </div>
  )
}
