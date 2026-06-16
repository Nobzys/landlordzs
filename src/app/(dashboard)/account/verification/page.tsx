import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Clock } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { KycResubmitForm } from '@/components/auth/KycResubmitForm'
import { Button } from '@/components/ui/button'
import { APPROVAL_REQUIRED_ROLES } from '@/lib/utils/constants'
import type { KycRecord } from '@/components/dashboard/VerificationBanner'

export const metadata: Metadata = { title: 'Verify Your Account' }

export default async function VerificationPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  if (!(APPROVAL_REQUIRED_ROLES as readonly string[]).includes(profile.role)) {
    redirect('/account/profile')
  }

  if (profile.account_status === 'active') {
    redirect('/account/profile')
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vr } = await (supabase as any)
    .from('verification_requests')
    .select('id, status, notes, submitted_at, verification_documents(document_type)')
    .eq('user_id', profile.id)
    .eq('verification_type', 'identity')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kyc: KycRecord | null = vr ? {
    id:                    vr.id,
    status:                vr.status,
    notes:                 vr.notes ?? null,
    submitted_at:          vr.submitted_at ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    has_id_front:          (vr.verification_documents ?? []).some((d: any) => d.document_type === 'id_front'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    has_id_back:           (vr.verification_documents ?? []).some((d: any) => d.document_type === 'id_back'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    has_professional_cert: (vr.verification_documents ?? []).some((d: any) => d.document_type === 'professional_cert'),
  } : null

  if (kyc?.status === 'under_review') {
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

      {kyc?.status === 'rejected' && kyc.notes && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-800">Rejection reason</p>
          <p className="text-xs text-red-700 mt-0.5">{kyc.notes}</p>
        </div>
      )}

      <KycResubmitForm profile={profile} />
    </div>
  )
}
