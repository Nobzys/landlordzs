import Link from 'next/link'

// Phase 16.4 — Self-contained homepage footer.
// Deferred from Phase 16.1 scope; included here to complete Phase 16.
// No shared layout is created — this component is used only on the homepage.

const PROPERTY_LINKS = [
  { href: '/properties?type=for_sale', label: 'Properties for Sale' },
  { href: '/properties?type=for_rent', label: 'Properties for Rent' },
  { href: '/properties?type=commercial', label: 'Commercial Space'  },
  { href: '/properties?type=land',     label: 'Land & Plots'        },
]

const MARKETPLACE_LINKS = [
  { href: '/materials',  label: 'Building Materials'  },
  { href: '/jobs',       label: 'Professionals'        },
  { href: '/services',   label: 'Home Services'        },
  { href: '/rentals',    label: 'Rentals'              },
  { href: '/tenders',    label: 'Jobs & Tenders'       },
]

const COMPANY_LINKS = [
  { href: '/register', label: 'Get Started Free' },
  { href: '/login',    label: 'Sign In'           },
  { href: '/register?role=seller', label: 'List a Property' },
  { href: '/register?role=buyer',  label: 'Find a Property' },
]

export default function HomeFooter() {
  return (
    <footer className="bg-[#111111] text-gray-400">

      {/* Ecosystem strip — payment rails and real estate industry body */}
      <div className="border-b border-white/10 py-8">
        <div className="max-w-[1280px] mx-auto px-5">
          <p className="text-center text-xs font-bold tracking-widest uppercase text-gray-600 mb-5">
            Payment &amp; Real Estate Ecosystem
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {[
              'MTN Mobile Money',
              'Orange Money',
              'Cameroon Bank',
              'Cameroon Real Estate Board',
            ].map(name => (
              <span
                key={name}
                className="text-[13px] font-semibold text-gray-500 whitespace-nowrap"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="py-12">
        <div className="max-w-[1280px] mx-auto px-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center text-[22px] font-extrabold tracking-[-0.5px] mb-4"
            >
              <span className="text-white">LANDLORD</span>
              <span style={{ color: '#B71C1C' }}>ZS</span>
            </Link>
            <p className="text-sm leading-[1.7] max-w-[220px]">
              Cameroon&apos;s all-in-one property platform. Buy, sell, rent, and build with confidence.
            </p>
          </div>

          {/* Properties */}
          <div>
            <h3 className="text-[13px] font-bold text-white uppercase tracking-widest mb-4">
              Properties
            </h3>
            <ul className="space-y-2.5">
              {PROPERTY_LINKS.map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Marketplace */}
          <div>
            <h3 className="text-[13px] font-bold text-white uppercase tracking-widest mb-4">
              Marketplace
            </h3>
            <ul className="space-y-2.5">
              {MARKETPLACE_LINKS.map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-[13px] font-bold text-white uppercase tracking-widest mb-4">
              Get Started
            </h3>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 py-5">
        <div className="max-w-[1280px] mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <p>© {new Date().getFullYear()} LANDLORDZS. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-gray-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/login" className="hover:text-gray-400 transition-colors">
              Terms of Use
            </Link>
            <Link href="/login" className="hover:text-gray-400 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>

    </footer>
  )
}
