import { redirect } from 'next/navigation'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'
import { getCapabilities } from '@/lib/config/roleCapabilities'
import { getProfileCompleteness } from '@/lib/utils/profileCompleteness'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  const capabilities = getCapabilities(profile.role)
  let hasPortfolioItems = false
  if (capabilities.hasPortfolio) {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('portfolio_items')
      .select('id', { count: 'exact', head: true })
      .eq('professional_id', profile.id)
    hasPortfolioItems = (count ?? 0) > 0
  }

  const completeness = getProfileCompleteness({
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    city: profile.city,
    isVerified: profile.is_verified,
    capabilities,
    hasPortfolioItems,
  })

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar profile={profile} completeness={completeness} />
      <div className="flex-1 overflow-y-auto min-w-0">
        {/* Spacer for the fixed mobile header */}
        <div className="h-14 md:hidden" />
        {children}
      </div>
    </div>
  )
}
