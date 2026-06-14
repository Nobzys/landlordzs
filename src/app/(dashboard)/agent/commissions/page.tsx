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
  const { data: rawKyc } = await (supabase as any)
    .from('kyc_records')
    .select('status, review_notes, national_id_front, national_id_back, business_reg, submitted_at')
    .eq('user_id', profile.id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const kyc = rawKyc as KycRecord | null

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
