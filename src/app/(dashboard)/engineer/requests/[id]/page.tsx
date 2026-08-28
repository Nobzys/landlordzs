import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Calendar, DollarSign, Clock, CheckCircle2 } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { Button } from '@/components/ui/button'
import { QuotationForm } from '@/components/services/QuotationForm'
import { cancelService } from '@/lib/actions/services'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { revalidatePath } from 'next/cache'

export const metadata: Metadata = { title: 'Service Request Detail — Engineer' }

interface EngineerRequestPageProps {
  params: Promise<{ id: string }>
}

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
}
const STATUS_LABELS: Record<string, string> = {
  open: 'Open', accepted: 'Accepted', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled',
}
const QUOT_COLORS: Record<string, string> = {
  pending:  'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  accepted: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  rejected: 'bg-slate-500/10 text-slate-500',
}

export default async function EngineerRequestDetailPage({ params }: EngineerRequestPageProps) {
  const { id } = await params
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'engineer') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  // Fetch the open request — RLS only shows open requests to non-clients
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: request } = await (supabase as any)
    .from('service_requests')
    .select('id, title, description, city, address, budget_min, budget_max, deadline, status, created_at, client_id, service_categories(name)')
    .eq('id', id)
    .eq('status', 'open')
    .single() as {
      data: {
        id: string; title: string; description: string; city: string | null
        address: string | null; budget_min: number | null; budget_max: number | null
        deadline: string | null; status: string; created_at: string; client_id: string
        service_categories: { name: string } | null
      } | null
    }

  // If not found or not open, check if the engineer has an accepted contract for it
  if (!request) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contract } = await (supabase as any)
      .from('service_contracts')
      .select('id, status, total_amount, start_date, end_date, request_id, service_requests(id, title, description, city, status, created_at, service_categories(name))')
      .eq('provider_id', profile.id)
      .eq('request_id', id)
      .single() as {
        data: {
          id: string; status: string; total_amount: number
          start_date: string | null; end_date: string | null; request_id: string
          service_requests: {
            id: string; title: string; description: string; city: string | null
            status: string; created_at: string; service_categories: { name: string } | null
          } | null
        } | null
      }

    if (!contract || !contract.service_requests) notFound()

    const r = contract.service_requests

    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Link href="/engineer/requests" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← My Requests
        </Link>

        <div className="rounded-xl border bg-card p-6 space-y-4">
          {r.service_categories && <p className="text-xs text-muted-foreground">{r.service_categories.name}</p>}
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold">{r.title}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[r.status] ?? ''}`}>
              {STATUS_LABELS[r.status] ?? r.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.description}</p>
          {cityLabel(r.city) && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />{cityLabel(r.city)}
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-3">
          <h2 className="font-semibold">Your Contract</h2>
          <div className="text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[contract.status] ?? ''}`}>
                {STATUS_LABELS[contract.status] ?? contract.status}
              </span>
            </div>
            <p className="text-muted-foreground">Agreed amount: <span className="text-foreground font-medium">{formatXAF(contract.total_amount)}</span></p>
            {contract.start_date && <p className="text-muted-foreground">Started: {formatDate(contract.start_date)}</p>}
            {contract.end_date && <p className="text-muted-foreground">Expected completion: {formatDate(contract.end_date)}</p>}
          </div>

          {contract.status === 'active' && (
            <form action={async () => {
              'use server'
              await cancelService(contract!.id)
              revalidatePath(`/engineer/requests/${id}`)
            }}>
              <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                Cancel Contract
              </Button>
            </form>
          )}

          {contract.status === 'completed' && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Service marked as completed by the client.
            </p>
          )}
        </div>
      </div>
    )
  }

  // Request is open — fetch the engineer's own quotation (if any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: myQuotation } = await (supabase as any)
    .from('service_quotations')
    .select('id, status, amount, timeline_days, proposal')
    .eq('request_id', id)
    .eq('provider_id', profile.id)
    .single() as {
      data: { id: string; status: string; amount: number; timeline_days: number | null; proposal: string } | null
    }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link href="/engineer/requests" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← My Requests
      </Link>

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
                : request.budget_min ? `From ${formatXAF(request.budget_min)}` : `Up to ${formatXAF(request.budget_max!)}`}
            </span>
          )}
          {request.deadline && (
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />Deadline: {formatDate(request.deadline)}</span>
          )}
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />Posted {formatDate(request.created_at)}</span>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        {myQuotation ? (
          <>
            <h2 className="font-semibold">Your Submitted Quotation</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${QUOT_COLORS[myQuotation.status] ?? ''}`}>
                  {myQuotation.status.charAt(0).toUpperCase() + myQuotation.status.slice(1)}
                </span>
                <span className="text-sm font-semibold">{formatXAF(myQuotation.amount)}</span>
                {myQuotation.timeline_days && (
                  <span className="text-sm text-muted-foreground">{myQuotation.timeline_days} days</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{myQuotation.proposal}</p>
            </div>
            {myQuotation.status === 'pending' && (
              <p className="text-sm text-muted-foreground">Awaiting client response.</p>
            )}
          </>
        ) : (
          <>
            <h2 className="font-semibold">Submit Your Quotation</h2>
            <QuotationForm requestId={request.id} />
          </>
        )}
      </div>
    </div>
  )
}
