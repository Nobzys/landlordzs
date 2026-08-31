import Link from 'next/link'

// Phase 16.4 — Marketplace vertical sections.
// 5 promotional sections surface the platform's non-property verticals.
// NOTE: /professionals has no page yet; "Hire Professionals" links to /jobs
// (nearest existing route) pending a dedicated professionals listing page.
// All subcategory cards link to the parent vertical route since sub-pages
// do not exist independently in the current build.

// ─── Building Materials ──────────────────────────────────────────────────────

const MATERIALS = [
  { emoji: '🏗️', label: 'Cement',            sub: '420+ products'  },
  { emoji: '🏠', label: 'Roofing',            sub: '280+ products'  },
  { emoji: '⚡', label: 'Electrical',         sub: '960+ products'  },
  { emoji: '🔧', label: 'Plumbing',           sub: '540+ products'  },
  { emoji: '🎨', label: 'Paint & Finishes',   sub: '320+ products'  },
  { emoji: '🟫', label: 'Tiles & Flooring',   sub: '1,200+ products'},
  { emoji: '🚪', label: 'Doors & Windows',    sub: '780+ products'  },
  { emoji: '☀️', label: 'Solar Equipment',    sub: '190+ products'  },
]

// ─── Hire Professionals ──────────────────────────────────────────────────────

const PROFESSIONALS = [
  { emoji: '🏛️', label: 'Architects',        sub: 'Design & planning'       },
  { emoji: '🔨', label: 'Contractors',        sub: 'Construction & builds'   },
  { emoji: '⚙️', label: 'Engineers',          sub: 'Structural & civil'      },
  { emoji: '⚡', label: 'Electricians',       sub: 'Wiring & installations'  },
  { emoji: '🔧', label: 'Plumbers',           sub: 'Pipes & sanitation'      },
  { emoji: '⚖️', label: 'Property Lawyers',  sub: 'Legal & conveyancing'    },
]

// ─── Home Services ───────────────────────────────────────────────────────────

const SERVICES = [
  { emoji: '🧹', label: 'Cleaning',           sub: 'Home & office'       },
  { emoji: '🗑️', label: 'Waste Collection',  sub: 'Disposal & recycling' },
  { emoji: '🔒', label: 'Security',           sub: 'Guards & systems'    },
  { emoji: '🌿', label: 'Landscaping',        sub: 'Gardens & lawns'     },
  { emoji: '🔧', label: 'Plumbing',           sub: 'Repairs & installs'  },
  { emoji: '⚡', label: 'Electrical',         sub: 'Wiring & repairs'    },
  { emoji: '🐛', label: 'Pest Control',       sub: 'Fumigation & prevention'},
]

// ─── Rentals ─────────────────────────────────────────────────────────────────

const EQUIPMENT_RENTALS = [
  { emoji: '🚜', label: 'Excavators',       sub: 'From 120K FCFA/day' },
  { emoji: '🏗️', label: 'Bulldozers',       sub: 'From 150K FCFA/day' },
  { emoji: '🚛', label: 'Trucks',           sub: 'From 45K FCFA/day'  },
  { emoji: '⚡', label: 'Generators',       sub: 'From 15K FCFA/day'  },
]

const VEHICLE_RENTALS = [
  { emoji: '🚗', label: 'Sedans & Cars',    sub: 'From 25K FCFA/day'  },
  { emoji: '🚙', label: 'SUVs',             sub: 'From 55K FCFA/day'  },
  { emoji: '🛻', label: 'Pickup Trucks',    sub: 'From 40K FCFA/day'  },
  { emoji: '🏎️', label: 'Luxury Vehicles', sub: 'From 120K FCFA/day' },
]

// ─── Jobs & Tenders ──────────────────────────────────────────────────────────

const JOBS = [
  { emoji: '🏗️', label: 'Construction',     sub: 'Site & project roles'    },
  { emoji: '⚙️', label: 'Engineering',      sub: 'Civil, structural & MEP' },
  { emoji: '🏠', label: 'Property Mgmt',   sub: 'Facilities & maintenance' },
  { emoji: '📐', label: 'Architecture',     sub: 'Design & drafting'        },
  { emoji: '⚖️', label: 'Legal & Finance', sub: 'Conveyancing & valuation' },
  { emoji: '📋', label: 'Tenders',          sub: 'Government & private'     },
]

// ─── Shared sub-card component ───────────────────────────────────────────────

function SubCard({
  href,
  emoji,
  label,
  sub,
}: {
  href: string
  emoji: string
  label: string
  sub: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-[#B71C1C] hover:shadow-sm transition-all duration-150 group"
    >
      <span className="text-2xl shrink-0" aria-hidden="true">{emoji}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-gray-900 leading-tight group-hover:text-[#B71C1C] transition-colors">
          {label}
        </span>
        <span className="block text-[11px] text-gray-500 leading-tight mt-0.5 truncate">
          {sub}
        </span>
      </span>
    </Link>
  )
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({
  title,
  sub,
  href,
  linkLabel,
}: {
  title: string
  sub: string
  href: string
  linkLabel: string
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h2
          className="font-extrabold text-[#222222] tracking-[-0.5px]"
          style={{ fontSize: 'clamp(18px, 2vw, 24px)' }}
        >
          {title}
        </h2>
        <p className="text-sm text-gray-500 mt-1">{sub}</p>
      </div>
      <Link
        href={href}
        className="text-[13.5px] font-semibold whitespace-nowrap hover:underline"
        style={{ color: '#B71C1C' }}
      >
        {linkLabel} →
      </Link>
    </div>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function MarketplaceSections() {
  return (
    <>

      {/* ── Building Materials ── */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-[1280px] mx-auto px-5">
          <SectionHeader
            title="Building Materials Marketplace"
            sub="Source quality materials from verified vendors across Cameroon"
            href="/materials"
            linkLabel="Shop All Materials"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {MATERIALS.map(m => (
              <SubCard key={m.label} href="/materials" emoji={m.emoji} label={m.label} sub={m.sub} />
            ))}
          </div>

          {/* Vendor CTA — invite material suppliers to list on the platform */}
          <div
            className="mt-6 rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #7f1111 0%, #B71C1C 60%, #c62828 100%)' }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-6 py-8 md:px-10">
              <div className="text-center sm:text-left">
                <p
                  className="text-[11px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  Become a Vendor
                </p>
                <h3
                  className="font-extrabold text-white leading-snug"
                  style={{ fontSize: 'clamp(18px, 2vw, 24px)' }}
                >
                  List your building materials
                </h3>
                <p
                  className="text-[14px] mt-1.5 max-w-[400px]"
                  style={{ color: 'rgba(255,255,255,0.80)' }}
                >
                  Reach thousands of buyers and builders across Cameroon — from Douala and
                  Yaoundé to every major city.
                </p>
              </div>
              <Link
                href="/register?role=vendor"
                className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white font-bold text-[14px] whitespace-nowrap hover:bg-gray-100 transition-colors"
                style={{ color: '#B71C1C' }}
              >
                Start Selling Free →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Hire Professionals ── */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-5">
          <SectionHeader
            title="Hire Professionals"
            sub="Work with verified, rated experts across all property disciplines"
            href="/jobs"
            linkLabel="Browse All"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {PROFESSIONALS.map(p => (
              <SubCard key={p.label} href="/jobs" emoji={p.emoji} label={p.label} sub={p.sub} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Home Services ── */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-[1280px] mx-auto px-5">
          <SectionHeader
            title="Home Services"
            sub="Book trusted services for your home or property"
            href="/services"
            linkLabel="All Services"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {SERVICES.map(s => (
              <SubCard key={s.label} href="/services" emoji={s.emoji} label={s.label} sub={s.sub} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Rentals ── */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-5">
          <SectionHeader
            title="Equipment &amp; Vehicle Rentals"
            sub="Heavy machinery, tools, and vehicles for construction and transport"
            href="/rentals"
            linkLabel="View All Rentals"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Equipment */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Equipment Rentals
              </p>
              <div className="grid grid-cols-2 gap-3">
                {EQUIPMENT_RENTALS.map(e => (
                  <SubCard key={e.label} href="/rentals" emoji={e.emoji} label={e.label} sub={e.sub} />
                ))}
              </div>
            </div>
            {/* Vehicles */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Vehicle Rentals
              </p>
              <div className="grid grid-cols-2 gap-3">
                {VEHICLE_RENTALS.map(v => (
                  <SubCard key={v.label} href="/rentals" emoji={v.emoji} label={v.label} sub={v.sub} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Jobs & Tenders ── */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-[1280px] mx-auto px-5">
          <SectionHeader
            title="Jobs &amp; Tenders"
            sub="Construction, engineering, and property opportunities across Cameroon"
            href="/tenders"
            linkLabel="All Listings"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {JOBS.map(j => (
              <SubCard key={j.label} href="/tenders" emoji={j.emoji} label={j.label} sub={j.sub} />
            ))}
          </div>
        </div>
      </section>

    </>
  )
}
