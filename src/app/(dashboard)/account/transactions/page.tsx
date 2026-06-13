import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/supabase/server'
import { TransactionList } from '@/components/payments/TransactionList'

export const metadata: Metadata = { title: 'Transaction History' }

export default async function TransactionsPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Transaction History</h1>
      <div className="rounded-xl border px-4">
        <TransactionList />
      </div>
    </div>
  )
}
