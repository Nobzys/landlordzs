import HomeNav from '@/components/marketing/home-nav'
import CategoryNav from '@/components/marketing/category-nav'

// Shared layout for all public marketplace pages in the (marketing) route group.
// Adds the approved LANDLORDZS two-tier header (HomeNav + CategoryNav) to every
// page in this group without duplicating the component implementation.
//
// Routes covered by this layout (route group does not affect URLs):
//   /properties   /properties/[id]
//   /materials    /materials/[slug]   /materials/[slug]/[productId]
//   /rentals      /rentals/[id]
//   /jobs         /jobs/[id]
//   /tenders      /tenders/[id]

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <HomeNav />
      <CategoryNav />
      {children}
    </div>
  )
}
