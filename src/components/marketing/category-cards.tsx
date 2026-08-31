import Link from 'next/link'

// Category cards per Phase 16 worksheet section 11.
// Cards use Deep Red accent (#fce4e4 bg / #B71C1C border-hover) matching the
// .prop-type-card / .prop-type-icon pattern in the index.html design reference.
// NOTE: /professionals does not yet have a page; linked to /jobs (nearest
// existing route) pending Phase 16.x professionals listing page.

const CATEGORIES = [
  {
    emoji: '🏠',
    label: 'Properties for Sale',
    sub:   'Buy your dream home in Cameroon',
    href:  '/properties?type=for_sale',
  },
  {
    emoji: '🔑',
    label: 'Properties for Rent',
    sub:   'Find your next rental property',
    href:  '/properties?type=for_rent',
  },
  {
    emoji: '🏢',
    label: 'Commercial Space',
    sub:   'Offices, retail shops & more',
    href:  '/properties?type=commercial',
  },
  {
    emoji: '🌍',
    label: 'Land & Plots',
    sub:   'Invest in Cameroon real estate',
    href:  '/properties?type=land',
  },
  {
    emoji: '🧱',
    label: 'Building Materials',
    sub:   'Cement, tiles, roofing & more',
    href:  '/materials',
  },
  {
    emoji: '👷',
    label: 'Professional Services',
    sub:   'Contractors, engineers & more',
    href:  '/jobs',
  },
] as const

export default function CategoryCards() {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-[1280px] mx-auto px-5">

        {/* Section header — matches .section-header pattern from index.html */}
        <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h2
              className="font-extrabold text-[#222222] tracking-[-0.5px]"
              style={{ fontSize: 'clamp(20px, 2.2vw, 28px)' }}
            >
              Browse by Category
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Properties, materials, and professional services across Cameroon
            </p>
          </div>
          <Link
            href="/properties"
            className="text-[13.5px] font-semibold whitespace-nowrap hover:underline"
            style={{ color: '#B71C1C' }}
          >
            View All →
          </Link>
        </div>

        {/* 6-column grid — 2-col mobile, 3-col tablet, 6-col desktop
            Matches .prop-type-grid responsive pattern from index.html */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group flex flex-col items-center text-center p-6 rounded-xl border border-gray-200 bg-white transition-all duration-200 hover:border-[#B71C1C] hover:shadow-md hover:-translate-y-[3px]"
            >
              {/* Icon container — matches .prop-type-icon from index.html */}
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center mb-3 text-3xl transition-colors duration-200"
                style={{ background: '#fce4e4' }}
                aria-hidden="true"
              >
                {cat.emoji}
              </div>
              <h3 className="text-[14px] font-bold text-gray-900 mb-1 leading-tight">
                {cat.label}
              </h3>
              <p className="text-[12px] text-gray-500 leading-snug">
                {cat.sub}
              </p>
            </Link>
          ))}
        </div>

      </div>
    </section>
  )
}
