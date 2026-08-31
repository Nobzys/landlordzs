import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/supabase/server'
import { ROLE_DASHBOARDS } from '@/types/auth'
import type { UserRole } from '@/types/auth'
import HomeNav from '@/components/marketing/home-nav'
import CategoryNav from '@/components/marketing/category-nav'
import Hero from '@/components/marketing/hero'
import TrustBar from '@/components/marketing/trust-bar'
import CategoryCards from '@/components/marketing/category-cards'
import FeaturedProperties from '@/components/marketing/featured-properties'
import MarketplaceSections from '@/components/marketing/marketplace-sections'
import DualCta from '@/components/marketing/dual-cta'
import HomeFooter from '@/components/marketing/home-footer'

// Root "/" — smart redirect:
//   authenticated  → role dashboard (e.g. /seller/listings)
//   unauthenticated → LANDLORDZS marketing homepage (Phase 16)
export default async function RootPage() {
  const profile = await getServerProfile().catch(() => null)

  if (profile) {
    const dest = ROLE_DASHBOARDS[profile.role as UserRole] ?? '/properties'
    redirect(dest)
  }

  return (
    <div className="min-h-screen bg-white">
      <HomeNav />
      <CategoryNav />
      <Hero />
      <TrustBar />
      <CategoryCards />
      <FeaturedProperties />
      <MarketplaceSections />
      <DualCta />
      <HomeFooter />
    </div>
  )
}
