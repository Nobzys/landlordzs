import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/supabase/server'
import { CommissionSummary } from '@/components/payments/CommissionSummary'

export const metadata: Metadata = { title: 'My Commissions' }

export default async function CommissionsPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'agent') redirect('/login')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your earnings from property sales and rentals
        </p>
      </div>
      <CommissionSummary />
    </div>
  )
}
