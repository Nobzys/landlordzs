import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { LinkButton } from '@/components/ui/link-button'
import { ServiceRequestCard } from '@/components/services/ServiceRequestCard'
import type { ServiceRequestSummary } from '@/components/services/ServiceRequestCard'

export const metadata: Metadata = { title: 'Service Requests — LandLordz' }

type RequestRow = {
  id:          string
  title:       string
  description: string
  city:        string | null
  budget_min:  number | null
  budget_max:  number | null
  deadline:    string | null
  status:      string
  created_at:  string
  service_categories: { name: string } | null
}

export default async function ServicesPage() {
  const supabase = await createClient()

  // Public browse — RLS svcreq_select already limits to status = 'open' for unauthenticated users
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('service_requests')
    .select(`
      id, title, description, city, budget_min, budget_max, deadline, status, created_at,
      service_categories(name)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50) as { data: RequestRow[] | null }

  const requests: ServiceRequestSummary[] = (data ?? []).map(r => ({
    id:          r.id,
    title:       r.title,
    description: r.description,
    city:        r.city,
    budget_min:  r.budget_min,
    budget_max:  r.budget_max,
    deadline:    r.deadline,
    status:      r.status,
    created_at:  r.created_at,
    category:    r.service_categories,
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {requests.length} open request{requests.length !== 1 ? 's' : ''} — browse and submit your quotation
          </p>
        </div>
        <LinkButton href="/services/new">Post a Request</LinkButton>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 border rounded-xl text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium mb-1">No open service requests</p>
          <p className="text-sm mb-4">Be the first to post a service request.</p>
          <LinkButton href="/services/new">Post a Request</LinkButton>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map(r => (
            <ServiceRequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  )
}
