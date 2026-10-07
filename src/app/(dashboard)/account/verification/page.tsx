import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Clock } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { KycResubmitForm } from '@/components/auth/KycResubmitForm'
import { Button } from '@/components/ui/button'
import { APPROVAL_REQUIRED_ROLES } from '@/lib/utils/constants'
import type { KycRecord } from '@/components/dashboard/VerificationBanner'
import { formatDate } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Verify Your Account' }

type KycHistoryRow = {
  id: string
  status: string
  review_notes: string | null
  submitted_at: string | null
  reviewed_at: string | null
}

const HISTORY_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:         { label: 'Under Review',     className: 'bg-blue-100 text-blue-700' },
  approved:        { label: 'Approved',         className: 'bg-emerald-100 text-emerald-700' },
  rejected:        { label: 'Rejected',         className: 'bg-red-100 text-red-700' },
  expired:         { label: 'Expired',          className: 'bg-orange-100 text-orange-700' },
  needs_more_info: { label: 'More Info Needed', className: 'bg-amber-100 text-amber-700' },
  under_review:    { label: 'Under Review',     className: 'bg-blue-100 text-blue-700' },
}

function KycHistory({ rows }: { rows: KycHistoryRow[] }) {
  if (!rows.length) return null
  return (
    <section className="space-y-3 border-t pt-6">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Submission History
      </h2>
      <ol className="space-y-3">
        {rows.map((row) => {
          const badge = HISTORY_STATUS_BADGE[row.status] ?? { label: row.status, className: 'bg-gray-100 text-gray-700' }
          return (
            <li key={row.id} className="rounded-xl border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                  {badge.label}
                </span>
                {row.submitted_at && (
                  <span className="text-xs text-muted-foreground">
                    Submitted {formatDate(row.submitted_at)}
                  </span>
                )}
              </div>
              {row.reviewed_at && (
                <p className="text-xs text-muted-foreground">
                  Reviewed {formatDate(row.reviewed_at)}
                </p>
              )}
              {row.review_notes && (
                <p className="text-xs text-foreground/80 border-t pt-2">{row.review_notes}</p>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default async function VerificationPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  if (!(APPROVAL_REQUIRED_ROLES as readonly string[]).includes(profile.role)) {
    redirect('/account/profile')
  }

  const supabase = await createClient()
  const { data: rawKyc } = await (supabase as any)
    .from('kyc_records')
    .select('status, review_notes, national_id_front, national_id_back, business_reg, submitted_at, expires_at')
    .eq('user_id', profile.id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const kyc = rawKyc as KycRecord | null

  const { data: rawHistory } = await (supabase as any)
    .from('kyc_records')
    .select('id, status, review_notes, submitted_at, reviewed_at')
    .eq('user_id', profile.id)
    .order('submitted_at', { ascending: false })

  const history = (rawHistory ?? []) as KycHistoryRow[]

  const isExpired =
    kyc?.status === 'expired' ||
    (!!kyc?.expires_at && new Date(kyc.expires_at) < new Date())

  // Active users with valid documents have nothing to do here
  if (profile.account_status === 'active' && !isExpired) {
    redirect('/account/profile')
  }

  if (isExpired) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="-ml-2">
            <Link href="/account/profile"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Resubmit Expired Documents</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your verification has expired. Please resubmit to remain active on the platform.
            </p>
          </div>
        </div>
        <KycResubmitForm profile={profile} />
        <KycHistory rows={history} />
      </div>
    )
  }

  if (kyc?.status === 'pending') {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="-ml-2">
            <Link href="/account/profile"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold">Verification</h1>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <Clock className="h-6 w-6 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800">Documents under review</p>
            <p className="text-sm text-blue-700 mt-1">
              Our team is reviewing your credentials. This usually takes 1–2 business days.
              We will notify you once the review is complete.
            </p>
          </div>
        </div>
        <KycHistory rows={history} />
      </div>
    )
  }

  if (kyc?.status === 'needs_more_info') {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="-ml-2">
            <Link href="/account/profile"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Additional Information Required</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Our team needs more information before we can complete your verification
            </p>
          </div>
        </div>

        {kyc.review_notes && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">Message from reviewer</p>
            <p className="text-sm text-amber-700 mt-1">{kyc.review_notes}</p>
          </div>
        )}

        <KycResubmitForm profile={profile} />
        <KycHistory rows={history} />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/account/profile"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {kyc?.status === 'rejected' ? 'Resubmit Documents' : 'Verify Your Account'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload your documents to get verified and appear in search results
          </p>
        </div>
      </div>

      {kyc?.status === 'rejected' && kyc.review_notes && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-800">Rejection reason</p>
          <p className="text-xs text-red-700 mt-0.5">{kyc.review_notes}</p>
        </div>
      )}

      <KycResubmitForm profile={profile} />
      <KycHistory rows={history} />
    </div>
  )
}
