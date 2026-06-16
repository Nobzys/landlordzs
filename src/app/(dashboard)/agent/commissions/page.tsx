import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { CommissionSummary } from '@/components/payments/CommissionSummary'
import { VerificationBanner, type KycRecord } from '@/components/dashboard/VerificationBanner'

export const metadata: Metadata = { title: 'My Commissions' }

export default async function CommissionsPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'agent') redirect('/login')
  requireActiveProfile(profile)

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your earnings from property sales and rentals
        </p>
      </div>
      <VerificationBanner accountStatus={profile.account_status} kyc={kyc} />
      <CommissionSummary />
    </div>
  )
}
