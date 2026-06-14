import Link from 'next/link'
import { AlertCircle, Clock, ShieldCheck, ShieldX, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface KycRecord {
  status:            'pending' | 'approved' | 'rejected'
  review_notes:      string | null
  national_id_front: string | null
  national_id_back:  string | null
  business_reg:      string | null
  submitted_at:      string | null
}

export function VerificationBanner({
  accountStatus,
  kyc,
}: {
  accountStatus: string
  kyc: KycRecord | null
}) {
  if (accountStatus === 'active') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
        <p className="text-sm font-medium text-emerald-800">Verified professional</p>
      </div>
    )
  }

  if (accountStatus !== 'pending_verification') return null

  if (!kyc) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Verification required</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Upload your national ID and professional credentials to get verified and appear in search results.
            </p>
            <div className="mt-2 space-y-1 text-xs text-amber-700">
              <p className="flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-amber-500" /> National ID — not submitted
              </p>
              <p className="flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-amber-500" /> Professional certificate — not submitted
              </p>
            </div>
          </div>
        </div>
        <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
          <Link href="/account/verification">Upload Documents</Link>
        </Button>
      </div>
    )
  }

  if (kyc.status === 'pending') {
    const missingDocs: string[] = []
    if (!kyc.national_id_front) missingDocs.push('National ID front')
    if (!kyc.national_id_back)  missingDocs.push('National ID back')

    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-800">Documents under review</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Our team is reviewing your credentials. This usually takes 1–2 business days.
          </p>
          {missingDocs.length > 0 && (
            <p className="text-xs text-blue-600 mt-1">Missing: {missingDocs.join(', ')}</p>
          )}
        </div>
      </div>
    )
  }

  if (kyc.status === 'rejected') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <ShieldX className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-800">Verification rejected</p>
            {kyc.review_notes && (
              <p className="text-xs text-red-700 mt-0.5">{kyc.review_notes}</p>
            )}
            <p className="text-xs text-red-600 mt-1">
              Please resubmit your documents addressing the feedback above.
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-100">
          <Link href="/account/verification">Resubmit Documents</Link>
        </Button>
      </div>
    )
  }

  return null
}
