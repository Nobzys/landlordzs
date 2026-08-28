import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Inbox } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { ServiceRequestCard } from '@/components/services/ServiceRequestCard'
import type { ServiceRequestSummary } from '@/components/services/ServiceRequestCard'

export const metadata: Metadata = { title: 'Service Requests — Lawyer' }

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

type QuotationRow = {
  id:          string
  status:      string
  amount:      number
  request_id:  string
  service_requests: {
    id: string; title: string; description: string; city: string | null
    budget_min: number | null; budget_max: number | null
    deadline: string | null; status: string; created_at: string
    service_categories: { name: string } | null
  } | null
}

export default async function LawyerRequestsPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'lawyer') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  // Open requests visible to all via RLS (status = 'open')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: openRequests } = await (supabase as any)
    .from('service_requests')
    .select(`
      id, title, description, city, budget_min, budget_max, deadline, status, created_at,
      service_categories(name)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(40) as { data: RequestRow[] | null }

  // The lawyer's own submitted quotations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: myQuotations } = await (supabase as any)
    .from('service_quotations')
    .select(`
      id, status, amount, request_id,
      service_requests(id, title, description, city, budget_min, budget_max, deadline, status, created_at,
        service_categories(name)
      )
    `)
    .eq('provider_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(20) as { data: QuotationRow[] | null }

  const requests: ServiceRequestSummary[] = (openRequests ?? []).map(r => ({
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

  const quotations = (myQuotations ?? []).filter(q => q.service_requests)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {quotations.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">My Quotations</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {quotations.map(q => {
              const r = q.service_requests!
              return (
                <ServiceRequestCard
                  key={q.id}
                  request={{
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
                  }}
                  href={`/lawyer/requests/${r.id}`}
                />
              )
            })}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Open Service Requests</h1>
          <span className="text-sm text-muted-foreground">{requests.length} available</span>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-16 border rounded-xl text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium mb-1">No open requests right now</p>
            <p className="text-sm">Check back later — new requests are posted frequently.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {requests.map(r => (
              <ServiceRequestCard
                key={r.id}
                request={r}
                href={`/lawyer/requests/${r.id}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
