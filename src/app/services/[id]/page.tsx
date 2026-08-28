import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Calendar, DollarSign, Clock, CheckCircle2, User } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { QuotationForm } from '@/components/services/QuotationForm'
import { acceptQuotation, completeService, cancelService } from '@/lib/actions/services'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { revalidatePath } from 'next/cache'

export const metadata: Metadata = { title: 'Service Request — LandLordz' }

interface ServiceDetailPageProps {
  params: Promise<{ id: string }>
}

const PROFESSIONAL_ROLES = ['contractor', 'engineer', 'architect', 'lawyer']

function formatXAF(amount: number) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency', currency: 'XAF', maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-CM', { year: 'numeric', month: 'short', day: 'numeric' })
}

function cityLabel(value: string | null) {
  if (!value) return null
  return CAMEROON_CITIES.find(c => c.value === value)?.label ?? value
}

const STATUS_COLORS: Record<string, string> = {
  open:        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  accepted:    'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  in_progress: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  completed:   'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  cancelled:   'bg-red-500/10 text-red-600 dark:text-red-400',
  disputed:    'bg-orange-500/10 text-orange-700 dark:text-orange-400',
}
const STATUS_LABELS: Record<string, string> = {
  open: 'Open', accepted: 'Accepted', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled', disputed: 'Disputed',
}
const QUOT_COLORS: Record<string, string> = {
  pending:  'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  accepted: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  rejected: 'bg-slate-500/10 text-slate-500',
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { id } = await params
  const profile = await getServerProfile()
  const supabase = await createClient()

  // Fetch the request — RLS allows open requests to any user (including unauthenticated)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: request } = await (supabase as any)
    .from('service_requests')
    .select('id, title, description, city, address, budget_min, budget_max, deadline, status, created_at, client_id, service_categories(name)')
    .eq('id', id)
    .single() as {
      data: {
        id: string; title: string; description: string; city: string | null
        address: string | null; budget_min: number | null; budget_max: number | null
        deadline: string | null; status: string; created_at: string; client_id: string
        service_categories: { name: string } | null
      } | null
    }

  // Open requests are publicly visible; non-open requests only to the client or admin
  if (!request) notFound()
  if (request.status !== 'open' && profile?.id !== request.client_id) notFound()

  const isClient       = !!profile && profile.id === request.client_id
  const isProfessional = !!profile && PROFESSIONAL_ROLES.includes(profile.role)

  // Fetch quotations — only the client sees all; RLS enforces this at DB level
  let quotations: {
    id: string; amount: number; currency: string; timeline_days: number | null
    proposal: string; status: string; accepted_at: string | null
    profiles: { full_name: string; role: string } | null
  }[] = []

  if (isClient) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('service_quotations')
      .select('id, amount, currency, timeline_days, proposal, status, accepted_at, profiles(full_name, role)')
      .eq('request_id', id)
      .order('created_at', { ascending: true })
    quotations = data ?? []
  }

  // Fetch professional's own quotation (if any)
  let myQuotation: { id: string; status: string; amount: number } | null = null
  if (isProfessional && !isClient && profile) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('service_quotations')
      .select('id, status, amount')
      .eq('request_id', id)
      .eq('provider_id', profile.id)
      .single()
    myQuotation = data ?? null
  }

  // Fetch active contract (client view only, when accepted)
  let contract: {
    id: string; status: string; total_amount: number; start_date: string | null; end_date: string | null
  } | null = null

  if (isClient && ['accepted', 'in_progress', 'completed'].includes(request.status)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('service_contracts')
      .select('id, status, total_amount, start_date, end_date')
      .eq('request_id', id)
      .eq('client_id', profile!.id)
      .single()
    contract = data ?? null
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-2">
        <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Service Requests
        </Link>
      </div>

      {/* Request header */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            {request.service_categories && (
              <p className="text-xs text-muted-foreground mb-1">{request.service_categories.name}</p>
            )}
            <h1 className="text-xl font-bold">{request.title}</h1>
          </div>
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[request.status] ?? ''}`}>
            {STATUS_LABELS[request.status] ?? request.status}
          </span>
        </div>

        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.description}</p>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground border-t pt-4">
          {cityLabel(request.city) && (
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{cityLabel(request.city)}</span>
          )}
          {(request.budget_min || request.budget_max) && (
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              {request.budget_min && request.budget_max
                ? `${formatXAF(request.budget_min)} – ${formatXAF(request.budget_max)}`
                : request.budget_min
                  ? `From ${formatXAF(request.budget_min)}`
                  : `Up to ${formatXAF(request.budget_max!)}`}
            </span>
          )}
          {request.deadline && (
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />Deadline: {formatDate(request.deadline)}</span>
          )}
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />Posted {formatDate(request.created_at)}</span>
        </div>
      </div>

      {/* Client view: active contract actions */}
      {isClient && contract && contract.status === 'active' && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Active Contract</h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Amount: <span className="text-foreground font-medium">{formatXAF(contract.total_amount)}</span></p>
            {contract.start_date && <p>Started: {formatDate(contract.start_date)}</p>}
            {contract.end_date && <p>Expected completion: {formatDate(contract.end_date)}</p>}
          </div>

          <div className="flex gap-3 flex-wrap">
            <form action={async () => {
              'use server'
              await completeService(contract!.id)
              revalidatePath(`/services/${id}`)
            }}>
              <Button type="submit">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Complete
              </Button>
            </form>

            <form action={async () => {
              'use server'
              await cancelService(contract!.id)
              revalidatePath(`/services/${id}`)
            }}>
              <Button type="submit" variant="ghost" className="text-destructive hover:text-destructive">
                Cancel Contract
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Client view: completed — review CTA */}
      {isClient && request.status === 'completed' && (
        <div className="rounded-xl border bg-card p-6 flex items-center justify-between gap-4">
          <p className="text-sm font-medium">Service completed. Leave a review for the professional?</p>
          <Link
            href={`/reviews/new?request_id=${request.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Write Review →
          </Link>
        </div>
      )}

      {/* Client view: quotations list */}
      {isClient && (
        <div className="space-y-4">
          <h2 className="font-semibold">
            Quotations ({quotations.length})
          </h2>
          {quotations.length === 0 ? (
            <p className="text-sm text-muted-foreground border rounded-xl p-6 text-center">
              No quotations yet. Professionals will submit proposals here.
            </p>
          ) : (
            <div className="space-y-4">
              {quotations.map(q => (
                <div key={q.id} className="rounded-xl border bg-card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {q.profiles?.full_name ?? 'Professional'}
                      </span>
                      {q.profiles?.role && (
                        <span className="text-xs text-muted-foreground capitalize">{q.profiles.role}</span>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${QUOT_COLORS[q.status] ?? ''}`}>
                      {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-semibold">{formatXAF(q.amount)}</span>
                    {q.timeline_days && (
                      <span className="text-muted-foreground">{q.timeline_days} days</span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.proposal}</p>

                  {q.status === 'pending' && request.status === 'open' && (
                    <form action={async () => {
                      'use server'
                      await acceptQuotation(q.id)
                      revalidatePath(`/services/${id}`)
                    }}>
                      <Button type="submit" size="sm">
                        Accept this Quotation
                      </Button>
                    </form>
                  )}

                  {q.status === 'accepted' && q.accepted_at && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Accepted on {formatDate(q.accepted_at)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Professional view: submit quotation or show existing */}
      {isProfessional && !isClient && request.status === 'open' && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          {myQuotation ? (
            <div className="space-y-2">
              <h2 className="font-semibold">Your Quotation</h2>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${QUOT_COLORS[myQuotation.status] ?? ''}`}>
                  {myQuotation.status.charAt(0).toUpperCase() + myQuotation.status.slice(1)}
                </span>
                <span className="text-sm font-medium">{formatXAF(myQuotation.amount)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                You have already submitted a quotation for this request.
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-semibold">Submit a Quotation</h2>
              <QuotationForm requestId={request.id} />
            </>
          )}
        </div>
      )}

      {/* Unauthenticated or buyer — CTA to log in */}
      {!profile && request.status === 'open' && (
        <div className="rounded-xl border bg-card p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in as a professional to submit a quotation.
          </p>
          <Link
            href={`/login?redirectTo=/services/${request.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Sign in →
          </Link>
        </div>
      )}
    </div>
  )
}
