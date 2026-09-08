import HomeNav from '@/components/marketing/home-nav'
import CategoryNav from '@/components/marketing/category-nav'
import HomeFooter from '@/components/marketing/home-footer'

// Shared layout for all public marketplace pages in the (marketing) route group.
// Adds the approved LANDLORDZS two-tier header (HomeNav + CategoryNav) and the
// HomeFooter to every page in this group without duplicating the component implementation.
//
// Routes covered by this layout (route group does not affect URLs):
//   /properties   /properties/[id]
//   /materials    /materials/[slug]   /materials/[slug]/[productId]
//   /rentals      /rentals/[id]
//   /jobs         /jobs/[id]
//   /tenders      /tenders/[id]
//   /services     /services/[id]     /services/new
//   /help

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <HomeNav />
      <CategoryNav />
      {children}
      <HomeFooter />
    </div>
  )
}
