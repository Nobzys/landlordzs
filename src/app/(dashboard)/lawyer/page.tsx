import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { ProfessionalDashboard, type KycRecord } from '@/components/dashboard/ProfessionalDashboard'

export const metadata: Metadata = { title: 'Lawyer Dashboard' }

export default async function LawyerPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'lawyer') redirect('/login')

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
      .from('kyc_records')
      .select('status, review_notes, national_id_front, national_id_back, business_reg, submitted_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as Promise<{ data: KycRecord | null }>,
  ])

  return (
    <ProfessionalDashboard
      profile={profile}
      prof={profResult.data ?? null}
      wallet={walletResult.data ?? null}
      kyc={kycResult.data ?? null}
    />
  )
}
