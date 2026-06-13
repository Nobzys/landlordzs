import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/supabase/server'
import { EscrowList } from '@/components/payments/EscrowList'

export const metadata: Metadata = { title: 'Escrow' }

export default async function EscrowPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Escrow</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Secure milestone-based payments for property transactions and services
        </p>
      </div>
      <EscrowList />
    </div>
  )
}
