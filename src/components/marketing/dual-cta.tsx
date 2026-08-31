import Link from 'next/link'

// Phase 16.4 — Dual Registration CTA.
// Replaces the App Download / App Store section from the index.html design
// reference. No mobile app exists; this section drives user registration
// instead. Per worksheet Section 12: no App Store or Google Play links.

const GRADIENT = 'linear-gradient(135deg, #1a0505 0%, #420e0e 50%, #6d1515 100%)'
const RADIAL   = 'radial-gradient(ellipse at 30% 60%, rgba(183,28,28,.22) 0%, transparent 65%)'

export default function DualCta() {
  return (
    <section
      className="relative py-16 md:py-24 overflow-hidden"
      style={{ background: GRADIENT }}
    >
      {/* Depth overlay — matches hero radial treatment */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: RADIAL }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 text-center">
        {/* Headline */}
        <h2
          className="font-extrabold text-white tracking-[-0.75px] leading-[1.15] mb-4"
          style={{ fontSize: 'clamp(26px, 3.5vw, 44px)' }}
        >
          Join LANDLORDZS Today
        </h2>
        <p
          className="max-w-[560px] mx-auto mb-10 leading-[1.7]"
          style={{
            fontSize: 'clamp(14px, 1.5vw, 17px)',
            color:    'rgba(255,255,255,.80)',
          }}
        >
          Buy, sell, or rent property. Source materials. Hire professionals.
          Everything you need — on one trusted Cameroonian platform.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Buyer / Tenant */}
          <Link
            href="/register?role=buyer"
            className="w-full sm:w-auto inline-flex flex-col items-center justify-center px-10 py-5 rounded-xl bg-white text-center transition-all duration-200 hover:bg-gray-100 hover:shadow-lg"
            style={{ minWidth: '220px' }}
          >
            <span className="text-2xl mb-1" aria-hidden="true">🔑</span>
            <span className="font-bold text-[#B71C1C] text-[16px] leading-tight">
              I&apos;m a Buyer / Tenant
            </span>
            <span className="text-[12px] text-gray-500 mt-0.5">
              Browse properties &amp; services
            </span>
          </Link>

          {/* Seller / Professional */}
          <Link
            href="/register?role=seller"
            className="w-full sm:w-auto inline-flex flex-col items-center justify-center px-10 py-5 rounded-xl border-2 border-white/40 text-center transition-all duration-200 hover:border-white hover:bg-white/10"
            style={{ minWidth: '220px' }}
          >
            <span className="text-2xl mb-1" aria-hidden="true">🏠</span>
            <span className="font-bold text-white text-[16px] leading-tight">
              I&apos;m a Seller / Pro
            </span>
            <span className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,.70)' }}>
              List properties &amp; services
            </span>
          </Link>
        </div>

        {/* Trust note — no sign-up fee */}
        <p className="mt-8 text-[12px]" style={{ color: 'rgba(255,255,255,.50)' }}>
          Free to join · No credit card required · Start in 2 minutes
        </p>
      </div>
    </section>
  )
}
