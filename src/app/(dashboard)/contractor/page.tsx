import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { ProfessionalDashboard, type KycRecord } from '@/components/dashboard/ProfessionalDashboard'

export const metadata: Metadata = { title: 'Contractor Dashboard' }

export default async function ContractorPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'contractor') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  const [profResult, walletResult, kycResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('professional_profiles')
      .select('profession_type, company_name, specializations, experience_years, day_rate, is_available, is_verified')
      .eq('id', profile.id)
      .single(),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('wallets')
      .select('balance, currency')
      .eq('user_id', profile.id)
      .single() as Promise<{ data: { balance: number; currency: string } | null }>,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('verification_requests')
      .select('id, status, notes, submitted_at, verification_documents(document_type)')
      .eq('user_id', profile.id)
      .eq('verification_type', 'identity')
      .order('submitted_at', { ascending: false })
      .limit(1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .maybeSingle() as Promise<{ data: any }>,
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vr = kycResult.data as any
  const kyc: KycRecord | null = vr ? {
    id:                    vr.id,
    status:                vr.status,
    notes:                 vr.notes ?? null,
    submitted_at:          vr.submitted_at ?? null,
    has_id_front:          (vr.verification_documents ?? []).some((d: any) => d.document_type === 'id_front'),
    has_id_back:           (vr.verification_documents ?? []).some((d: any) => d.document_type === 'id_back'),
    has_professional_cert: (vr.verification_documents ?? []).some((d: any) => d.document_type === 'professional_cert'),
  } : null

  return (
    <ProfessionalDashboard
      profile={profile}
      prof={profResult.data ?? null}
      wallet={walletResult.data ?? null}
      kyc={kyc}
    />
  )
}
