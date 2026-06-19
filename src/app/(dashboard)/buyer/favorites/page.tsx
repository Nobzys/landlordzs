import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Heart, Eye, Activity, Search } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { FavoritesGrid } from '@/components/properties/FavoritesGrid'
import { MetricsGrid } from '@/components/dashboard/MetricsGrid'
import { LinkButton } from '@/components/ui/link-button'

export const metadata: Metadata = { title: 'Saved Properties' }

async function getBuyerMetrics(userId: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const [savedRes, viewingRes, recentFavoritesRes, recentInquiriesRes] = await Promise.all([
    sb.from('property_favorites').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    sb.from('property_inquiries').select('id', { count: 'exact', head: true }).eq('sender_id', userId).eq('type', 'viewing'),
    sb.from('property_favorites').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', fourteenDaysAgo),
    sb.from('property_inquiries').select('id', { count: 'exact', head: true }).eq('sender_id', userId).gte('created_at', fourteenDaysAgo),
  ])

  return {
    savedProperties: savedRes.count ?? 0,
    viewingRequests: viewingRes.count ?? 0,
    recentActivity: (recentFavoritesRes.count ?? 0) + (recentInquiriesRes.count ?? 0),
  }
}

export default async function FavoritesPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  const metrics = await getBuyerMetrics(profile.id)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Saved Properties</h1>
        <LinkButton href="/properties">
          <Search className="h-4 w-4 mr-2" />
          Browse Properties
        </LinkButton>
      </div>

      <MetricsGrid
        metrics={[
          { icon: Heart, label: 'Saved Properties', value: metrics.savedProperties },
          { icon: Eye, label: 'Viewing Requests', value: metrics.viewingRequests },
          { icon: Activity, label: 'Recent Activity', value: metrics.recentActivity, sublabel: 'last 14 days' },
        ]}
      />

      <FavoritesGrid />
    </div>
  )
}
