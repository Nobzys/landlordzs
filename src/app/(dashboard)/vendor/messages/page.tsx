import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'

export const metadata: Metadata = { title: 'Messages — Vendor' }

export default async function VendorMessagesPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'vendor') redirect('/login')
  requireActiveProfile(profile)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-sm text-muted-foreground">Buyer conversations about your store and products.</p>
      </div>
      <EmptyState
        icon={MessageSquare}
        title="Messaging is coming soon."
        description="Buyer-to-vendor conversations will appear here once direct messaging launches."
      />
    </div>
  )
}
