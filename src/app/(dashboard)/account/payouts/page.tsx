import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { WalletCard } from '@/components/payments/WalletCard'
import { PayoutRequestForm } from '@/components/payments/PayoutRequestForm'
import { PayoutsList } from '@/components/payments/PayoutsList'

export const metadata: Metadata = { title: 'Payouts' }

export default async function PayoutsPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  const supabase = await createClient()
  const { data: minSetting } = await (supabase as any)
    .from('platform_settings')
    .select('value')
    .eq('key', 'min_withdrawal_xaf')
    .single()
  const minWithdrawal = Math.max(1, parseInt(minSetting?.value ?? '', 10) || 5000)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payouts</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Request Payout</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <PayoutRequestForm minWithdrawal={minWithdrawal} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <WalletCard />
      <PayoutsList />
    </div>
  )
}
