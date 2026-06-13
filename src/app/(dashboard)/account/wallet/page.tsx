import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { WalletCard } from '@/components/payments/WalletCard'
import { TransactionList } from '@/components/payments/TransactionList'
import { WalletTopUpForm } from '@/components/payments/WalletTopUpForm'

export const metadata: Metadata = { title: 'My Wallet' }

export default async function WalletPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Top Up
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Top Up Wallet</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <WalletTopUpForm />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <WalletCard />

      <div className="rounded-xl border">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Recent Transactions</h2>
        </div>
        <div className="px-4">
          <TransactionList />
        </div>
      </div>
    </div>
  )
}
