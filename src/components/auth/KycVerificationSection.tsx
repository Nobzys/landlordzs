import { ShieldCheck, Clock, FileCheck2, FileX2 } from 'lucide-react'
import { KycResubmitForm } from './KycResubmitForm'
import { formatDate } from '@/lib/utils/format'
import type { Profile } from '@/types/auth'
import type { KycRecord } from '@/components/dashboard/VerificationBanner'

interface Props {
  profile: Profile
  kyc: KycRecord | null
}

const KYC_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  under_review: { label: 'Under Review', className: 'bg-blue-100 text-blue-700' },
  submitted:    { label: 'Submitted',    className: 'bg-blue-100 text-blue-700' },
  approved:     { label: 'Approved',     className: 'bg-emerald-100 text-emerald-700' },
  rejected:     { label: 'Rejected',     className: 'bg-red-100 text-red-700' },
  expired:      { label: 'Expired',      className: 'bg-gray-100 text-gray-700' },
}

function DocRow({ label, uploaded }: { label: string; uploaded: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {uploaded
        ? <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        : <FileX2    className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      }
      <span className={uploaded ? 'text-foreground' : 'text-muted-foreground'}>
        {label} — {uploaded ? 'uploaded' : 'not submitted'}
      </span>
    </div>
  )
}

export function KycVerificationSection({ profile, kyc }: Props) {
  const accountStatus = profile.account_status
  const kycStatus     = kyc?.status ?? null

  // Show the upload form only when the account still needs docs and the
  // previous submission (if any) was rejected — not while pending review.
  const showUploadForm =
    accountStatus === 'pending_verification' &&
    (kyc === null || kycStatus === 'rejected')

  const accountBadge =
    accountStatus === 'active'               ? { label: 'Verified',             className: 'bg-emerald-100 text-emerald-700' } :
    accountStatus === 'pending_verification' ? { label: 'Pending Verification', className: 'bg-amber-100 text-amber-700' }    :
    accountStatus === 'suspended'            ? { label: 'Suspended',            className: 'bg-red-100 text-red-700' }         :
    { label: accountStatus, className: 'bg-gray-100 text-gray-700' }

  return (
    <section
      id="identity-verification"
      className="space-y-4 scroll-mt-20 border-t pt-6"
      aria-labelledby="kyc-heading"
    >
      {/* Section header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 id="kyc-heading" className="text-lg font-semibold">Identity Verification</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Required to activate your account and access all platform features.
          </p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${accountBadge.className}`}>
          {accountBadge.label}
        </span>
      </div>

      {/* Existing submission */}
      {kyc && (
        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-medium">Submitted documents</p>
            <div className="flex items-center gap-2 flex-wrap">
              {kycStatus && KYC_STATUS_BADGE[kycStatus] && (
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${KYC_STATUS_BADGE[kycStatus].className}`}>
                  {KYC_STATUS_BADGE[kycStatus].label}
                </span>
              )}
              {kyc.submitted_at && (
                <span className="text-xs text-muted-foreground">
                  {formatDate(kyc.submitted_at)}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <DocRow label="National ID — Front"        uploaded={kyc.has_id_front}          />
            <DocRow label="National ID — Back"         uploaded={kyc.has_id_back}           />
            <DocRow label="Professional Certificate"   uploaded={kyc.has_professional_cert} />
          </div>

          {kycStatus === 'under_review' && (
            <div className="flex items-center gap-2 border-t pt-2">
              <Clock className="h-4 w-4 text-blue-500 shrink-0" />
              <p className="text-xs text-blue-700">
                Our team is reviewing your documents. This usually takes 1–2 business days.
              </p>
            </div>
          )}

          {kycStatus === 'rejected' && kyc.notes && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 border-t pt-2">
              <span className="font-semibold">Rejection reason: </span>
              {kyc.notes}
            </div>
          )}

          {kycStatus === 'approved' && (
            <div className="flex items-center gap-2 border-t pt-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-700 font-medium">Documents verified — your account is active.</p>
            </div>
          )}
        </div>
      )}

      {/* Upload instructions (only shown when form is available) */}
      {showUploadForm && (
        <div className="rounded-lg border bg-muted/20 px-4 py-3 space-y-1.5">
          <p className="text-sm font-medium">What you need to upload</p>
          <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
            <li>National ID card — clear photo of the front <strong>and</strong> back</li>
            <li>Professional license or certificate (optional)</li>
            <li>Accepted formats: JPG, PNG, PDF — max 20 MB each</li>
          </ul>
        </div>
      )}

      {/* Upload form */}
      {showUploadForm && (
        <KycResubmitForm profile={profile} />
      )}

      {/* No docs, account already active or suspended */}
      {!kyc && accountStatus !== 'pending_verification' && (
        <p className="text-sm text-muted-foreground">No documents on record.</p>
      )}
    </section>
  )
}
