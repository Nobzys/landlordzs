'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

// ─── Topbar dropdown data ─────────────────────────────────────────────────────

const TOPBAR_LINK_CLS = 'text-[12px] text-white/65 hover:text-white transition-colors whitespace-nowrap'

// ── Help ─────────────────────────────────────────────────────────────────────
const HELP_GENERAL = [
  { icon: '🔍', label: 'Find Answers',            href: '/help'                         },
  { icon: '📚', label: 'Knowledge Base',           href: '/help#guides'                  },
  { icon: '✉️',  label: 'Contact Support',         href: 'mailto:support@landlordzs.com' },
]
const HELP_BY_ROLE = [
  { label: 'For Buyers',              href: '/help#for-buyers'        },
  { label: 'For Sellers & Landlords', href: '/help#for-sellers'       },
  { label: 'For Renters',             href: '/help#for-renters'       },
  { label: 'For Agents',             href: '/help#for-agents'        },
  { label: 'For Professionals',       href: '/help#for-professionals' },
  { label: 'For Vendors',             href: '/help#for-vendors'       },
  { label: 'Payments & Safety',       href: '/help#payments'          },
  { label: 'Privacy & Complaints',    href: '/help#privacy'           },
]

// ── Buyers ────────────────────────────────────────────────────────────────────
const BUYERS_GENERAL = [
  { icon: '🏠', label: 'Browse Properties',  href: '/properties' },
  { icon: '🔑', label: 'Find a Rental',      href: '/rentals'    },
  { icon: '🌍', label: 'Land & Plots',       href: '/properties' },
  { icon: '🧱', label: 'Building Materials', href: '/materials'  },
]
const BUYERS_ACCOUNT = [
  { label: 'My Favourites',      href: '/buyer/favorites' },
  { label: 'Property Viewings',  href: '/buyer/bookings'  },
  { label: 'My Inquiries',       href: '/buyer/inquiries' },
  { label: 'Compare Properties', href: '/buyer/compare'   },
  { label: 'Shopping Cart',      href: '/buyer/cart'      },
]

// ── Sellers ───────────────────────────────────────────────────────────────────
const SELLERS_GENERAL = [
  { icon: '📝', label: 'Post a Property',  href: '/seller/listings/new' },
  { icon: '🚀', label: 'Seller Dashboard', href: '/seller'              },
  { icon: '❓', label: 'Seller Help',      href: '/help#for-sellers'    },
]
const SELLERS_ACCOUNT = [
  { label: 'My Listings',      href: '/seller/listings'      },
  { label: 'Buyer Inquiries',  href: '/seller/inquiries'     },
  { label: 'Booking Requests', href: '/seller/bookings'      },
  { label: 'Join as Seller →', href: '/register?role=seller' },
]

// ── Shopping ──────────────────────────────────────────────────────────────────
const SHOP_CATEGORIES = [
  { icon: '🧱', label: 'Building Materials', href: '/materials'              },
  { icon: '🚜', label: 'Equipment Rentals',  href: '/rentals?type=equipment' },
  { icon: '🚗', label: 'Vehicle Rentals',    href: '/rentals?type=vehicle'   },
  { icon: '🔧', label: 'Home Services',      href: '/services'               },
  { icon: '💼', label: 'Jobs & Tenders',     href: '/tenders'                },
]
const SHOP_ACCOUNT = [
  { label: 'Shopping Cart',   href: '/buyer/cart'   },
  { label: 'Post a Service',  href: '/services/new' },
  { label: 'Vendor Dashboard', href: '/vendor'      },
]

// ─── All Categories mega-menu ─────────────────────────────────────────────────
// "Community" omitted — no route exists.
// "Real Estate Agents" → /properties (no agent-directory route yet).
// "Property Lawyers", "Contractors", "Engineers & Architects" → /jobs
//   (/professionals page does not exist; /jobs is the nearest existing route).
const CATEGORIES = [
  { icon: '🏠', name: 'Properties for Sale',   sub: 'Buy your dream home',     href: '/properties'             },
  { icon: '🔑', name: 'Properties for Rent',    sub: 'Find rental homes',       href: '/properties'             },
  { icon: '🌍', name: 'Land & Plots',           sub: 'Invest in land',          href: '/properties'             },
  { icon: '🏢', name: 'Commercial Property',    sub: 'Offices, shops & more',   href: '/properties'             },
  { icon: '⚖️', name: 'Property Lawyers',       sub: 'Legal professionals',     href: '/jobs'                   },
  { icon: '🧱', name: 'Building Materials',     sub: 'Cement, tiles & more',    href: '/materials'              },
  { icon: '🔨', name: 'Contractors',            sub: 'Hire skilled builders',   href: '/jobs'                   },
  { icon: '📐', name: 'Engineers & Architects', sub: 'Design professionals',    href: '/jobs'                   },
  { icon: '🏷️', name: 'Real Estate Agents',    sub: 'Trusted local agents',    href: '/properties'             },
  { icon: '🧹', name: 'Cleaning Services',      sub: 'Home & office cleaning',  href: '/services'               },
  { icon: '🗑️', name: 'Waste Collection',       sub: 'Disposal & recycling',   href: '/services'               },
  { icon: '🔒', name: 'Security Services',      sub: 'Guards & surveillance',   href: '/services'               },
  { icon: '🚜', name: 'Equipment Rentals',      sub: 'Heavy machinery hire',    href: '/rentals?type=equipment' },
  { icon: '🚗', name: 'Vehicle Rentals',        sub: 'Cars, SUVs & trucks',     href: '/rentals?type=vehicle'   },
  { icon: '🔧', name: 'Home Maintenance',       sub: 'Repairs & installations', href: '/services'               },
  { icon: '💼', name: 'Jobs & Tenders',         sub: 'Construction & property', href: '/tenders'                },
]

type MenuKey = 'buyers' | 'sellers' | 'shop' | 'help'

// Shared dropdown panel chrome — header bar + 2-column grid
function DropdownPanel({
  title,
  leftCol,
  rightTitle,
  rightCol,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: {
  title: string
  leftCol: React.ReactNode
  rightTitle: string
  rightCol: React.ReactNode
  onClose: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  return (
    <div
      role="menu"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute top-[calc(100%+8px)] left-0 z-[60] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
      style={{ width: '480px' }}
    >
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{title}</span>
        <button
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="text-gray-400 hover:text-gray-700 text-lg leading-none bg-transparent border-none cursor-pointer"
        >
          ×
        </button>
      </div>
      <div className="grid grid-cols-2 p-3 gap-0">
        <div className="border-r border-gray-100 pr-1">{leftCol}</div>
        <div className="pl-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 pt-1.5 pb-1">{rightTitle}</p>
          {rightCol}
        </div>
      </div>
    </div>
  )
}

function DropdownIconItem({ icon, label, href, onClose }: { icon: string; label: string; href: string; onClose: () => void }) {
  return (
    <a
      href={href}
      role="menuitem"
      onClick={onClose}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#fce4e4] transition-colors group"
    >
      <span className="text-lg shrink-0" aria-hidden="true">{icon}</span>
      <span className="text-[13px] font-semibold text-gray-800 group-hover:text-[#B71C1C] transition-colors">{label}</span>
    </a>
  )
}

function DropdownTextItem({ label, href, onClose }: { label: string; href: string; onClose: () => void }) {
  return (
    <a
      href={href}
      role="menuitem"
      onClick={onClose}
      className="block px-3 py-1.5 text-[12.5px] text-gray-700 hover:text-[#B71C1C] rounded-lg hover:bg-[#fce4e4] transition-colors"
    >
      {label}
    </a>
  )
}

export default function HomeNav() {
  const [catOpen,    setCatOpen]    = useState(false)
  const [openMenu,   setOpenMenu]   = useState<MenuKey | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)

  const catRef         = useRef<HTMLDivElement>(null)
  const buyersRef      = useRef<HTMLDivElement>(null)
  const sellersRef     = useRef<HTMLDivElement>(null)
  const shopRef        = useRef<HTMLDivElement>(null)
  const helpRef        = useRef<HTMLDivElement>(null)
  const menuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function openDropdown(key: MenuKey) {
    if (menuCloseTimer.current) clearTimeout(menuCloseTimer.current)
    setOpenMenu(key)
  }
  function startCloseDropdown() {
    menuCloseTimer.current = setTimeout(() => setOpenMenu(null), 150)
  }
  function closeDropdown() { setOpenMenu(null) }

  // Close All-Categories mega-menu on outside click or Escape
  useEffect(() => {
    if (!catOpen) return
    function onInteract(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') setCatOpen(false)
        return
      }
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
    }
    document.addEventListener('mousedown', onInteract)
    document.addEventListener('keydown',   onInteract)
    return () => {
      document.removeEventListener('mousedown', onInteract)
      document.removeEventListener('keydown',   onInteract)
    }
  }, [catOpen])

  // Close topbar dropdowns on outside click or Escape (unified — only one open at a time)
  useEffect(() => {
    if (!openMenu) return
    const refMap = { buyers: buyersRef, sellers: sellersRef, shop: shopRef, help: helpRef }
    const key = openMenu
    function onInteract(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') setOpenMenu(null)
        return
      }
      if (refMap[key].current && !refMap[key].current!.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onInteract)
    document.addEventListener('keydown',   onInteract)
    return () => {
      document.removeEventListener('mousedown', onInteract)
      document.removeEventListener('keydown',   onInteract)
    }
  }, [openMenu])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // ─── Shared topbar trigger button ─────────────────────────────────────────
  function TriggerButton({ id, label, refEl }: { id: MenuKey; label: string; refEl: React.RefObject<HTMLDivElement | null> }) {
    const isOpen = openMenu === id
    return (
      <div ref={refEl} className="relative">
        <button
          onMouseEnter={() => openDropdown(id)}
          onMouseLeave={startCloseDropdown}
          onClick={() => setOpenMenu(isOpen ? null : id)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          className={`${TOPBAR_LINK_CLS} flex items-center gap-1 bg-transparent border-none cursor-pointer p-0`}
        >
          {label}
          <svg
            width="8" height="8" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
            className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
      </div>
    )
  }

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          TWO-TIER STICKY HEADER
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-50">

        {/* ── TIER 1: Topbar (desktop + tablet only) ──────────────────────── */}
        <div className="hidden md:block bg-[#222222] border-b border-white/10">
          <div className="max-w-[1280px] mx-auto px-5 flex items-center justify-between h-9">

            {/* Left utility links with dropdowns */}
            <nav className="flex items-center gap-5" aria-label="Utility links">

              {/* ── For Buyers ─────────────────────────────────────────────── */}
              <div ref={buyersRef} className="relative">
                <button
                  onMouseEnter={() => openDropdown('buyers')}
                  onMouseLeave={startCloseDropdown}
                  onClick={() => setOpenMenu(openMenu === 'buyers' ? null : 'buyers')}
                  aria-expanded={openMenu === 'buyers'}
                  aria-haspopup="true"
                  className={`${TOPBAR_LINK_CLS} flex items-center gap-1 bg-transparent border-none cursor-pointer p-0`}
                >
                  For Buyers
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
                    className={`transition-transform duration-150 ${openMenu === 'buyers' ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {openMenu === 'buyers' && (
                  <DropdownPanel
                    title="For Buyers"
                    rightTitle="My Account"
                    onClose={closeDropdown}
                    onMouseEnter={() => openDropdown('buyers')}
                    onMouseLeave={startCloseDropdown}
                    leftCol={BUYERS_GENERAL.map(i => (
                      <DropdownIconItem key={i.label} icon={i.icon} label={i.label} href={i.href} onClose={closeDropdown} />
                    ))}
                    rightCol={BUYERS_ACCOUNT.map(i => (
                      <DropdownTextItem key={i.label} label={i.label} href={i.href} onClose={closeDropdown} />
                    ))}
                  />
                )}
              </div>

              {/* ── For Sellers ────────────────────────────────────────────── */}
              <div ref={sellersRef} className="relative">
                <button
                  onMouseEnter={() => openDropdown('sellers')}
                  onMouseLeave={startCloseDropdown}
                  onClick={() => setOpenMenu(openMenu === 'sellers' ? null : 'sellers')}
                  aria-expanded={openMenu === 'sellers'}
                  aria-haspopup="true"
                  className={`${TOPBAR_LINK_CLS} flex items-center gap-1 bg-transparent border-none cursor-pointer p-0`}
                >
                  For Sellers
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
                    className={`transition-transform duration-150 ${openMenu === 'sellers' ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {openMenu === 'sellers' && (
                  <DropdownPanel
                    title="For Sellers & Landlords"
                    rightTitle="Seller Dashboard"
                    onClose={closeDropdown}
                    onMouseEnter={() => openDropdown('sellers')}
                    onMouseLeave={startCloseDropdown}
                    leftCol={SELLERS_GENERAL.map(i => (
                      <DropdownIconItem key={i.label} icon={i.icon} label={i.label} href={i.href} onClose={closeDropdown} />
                    ))}
                    rightCol={SELLERS_ACCOUNT.map(i => (
                      <DropdownTextItem key={i.label} label={i.label} href={i.href} onClose={closeDropdown} />
                    ))}
                  />
                )}
              </div>

              {/* ── Help ───────────────────────────────────────────────────── */}
              <div ref={helpRef} className="relative">
                <button
                  onMouseEnter={() => openDropdown('help')}
                  onMouseLeave={startCloseDropdown}
                  onClick={() => setOpenMenu(openMenu === 'help' ? null : 'help')}
                  aria-expanded={openMenu === 'help'}
                  aria-haspopup="true"
                  className={`${TOPBAR_LINK_CLS} flex items-center gap-1 bg-transparent border-none cursor-pointer p-0`}
                >
                  Help
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
                    className={`transition-transform duration-150 ${openMenu === 'help' ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {openMenu === 'help' && (
                  <DropdownPanel
                    title="Help & Support"
                    rightTitle="By Role"
                    onClose={closeDropdown}
                    onMouseEnter={() => openDropdown('help')}
                    onMouseLeave={startCloseDropdown}
                    leftCol={HELP_GENERAL.map(i => (
                      <DropdownIconItem key={i.label} icon={i.icon} label={i.label} href={i.href} onClose={closeDropdown} />
                    ))}
                    rightCol={HELP_BY_ROLE.map(i => (
                      <DropdownTextItem key={i.label} label={i.label} href={i.href} onClose={closeDropdown} />
                    ))}
                  />
                )}
              </div>

              {/* ── Shopping ───────────────────────────────────────────────── */}
              <div ref={shopRef} className="relative">
                <button
                  onMouseEnter={() => openDropdown('shop')}
                  onMouseLeave={startCloseDropdown}
                  onClick={() => setOpenMenu(openMenu === 'shop' ? null : 'shop')}
                  aria-expanded={openMenu === 'shop'}
                  aria-haspopup="true"
                  className={`${TOPBAR_LINK_CLS} flex items-center gap-1 bg-transparent border-none cursor-pointer p-0`}
                >
                  Shopping
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
                    className={`transition-transform duration-150 ${openMenu === 'shop' ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {openMenu === 'shop' && (
                  <DropdownPanel
                    title="Shopping"
                    rightTitle="My Shopping"
                    onClose={closeDropdown}
                    onMouseEnter={() => openDropdown('shop')}
                    onMouseLeave={startCloseDropdown}
                    leftCol={SHOP_CATEGORIES.map(i => (
                      <DropdownIconItem key={i.label} icon={i.icon} label={i.label} href={i.href} onClose={closeDropdown} />
                    ))}
                    rightCol={SHOP_ACCOUNT.map(i => (
                      <DropdownTextItem key={i.label} label={i.label} href={i.href} onClose={closeDropdown} />
                    ))}
                  />
                )}
              </div>

              {/* ── Messages (protected — auth required) ───────────────────── */}
              <Link href="/login" className={TOPBAR_LINK_CLS}>Messages</Link>

            </nav>

            {/* Right: auth + cart + post-property */}
            <div className="flex items-center gap-3">
              <Link href="/login"    className="text-[12px] text-white/65 hover:text-white transition-colors">Sign In</Link>
              <span className="text-white/20 select-none text-[11px]">|</span>
              <Link href="/register" className="text-[12px] text-white/65 hover:text-white transition-colors">Join</Link>
              <Link
                href="/buyer/cart"
                aria-label="Shopping cart"
                className="ml-1 text-white/65 hover:text-white transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="9"  cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
              </Link>
              <Link
                href="/register"
                className="ml-1 text-[11.5px] font-semibold text-white bg-[#B71C1C] hover:bg-[#9c1414] px-3 py-[5px] rounded transition-colors whitespace-nowrap"
              >
                Post Property Free
              </Link>
            </div>

          </div>
        </div>

        {/* ── TIER 2: Main header ─────────────────────────────────────────── */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-[1280px] mx-auto px-5 flex items-center gap-3 h-16">

            {/* Logo */}
            <Link
              href="/"
              className="flex items-center shrink-0 text-[22px] font-extrabold tracking-[-0.5px] mr-1"
            >
              <span className="text-[#222222]">LANDLORD</span>
              <span className="text-[#B71C1C]">ZS</span>
            </Link>

            {/* All Categories + mega-dropdown (desktop/tablet) */}
            <div ref={catRef} className="relative hidden md:block shrink-0">
              <button
                onClick={() => setCatOpen(o => !o)}
                aria-expanded={catOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 h-10 px-4 rounded-[6px] bg-[#B71C1C] hover:bg-[#7f1111] text-[13.5px] font-semibold text-white transition-colors select-none border-0"
              >
                <span className="flex flex-col gap-[3.5px] shrink-0" aria-hidden="true">
                  <span className="block w-[13px] h-[1.5px] bg-current rounded" />
                  <span className="block w-[13px] h-[1.5px] bg-current rounded" />
                  <span className="block w-[13px] h-[1.5px] bg-current rounded" />
                </span>
                All Categories
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
                  className={`transition-transform duration-200 shrink-0 ${catOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {catOpen && (
                <div
                  role="menu"
                  className="absolute top-[calc(100%+6px)] left-0 z-[60] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
                  style={{ width: '680px' }}
                >
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">All Categories</span>
                    <button
                      onClick={() => setCatOpen(false)}
                      aria-label="Close categories"
                      className="text-gray-400 hover:text-gray-700 text-lg leading-none bg-transparent border-none cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                  <div className="grid grid-cols-2 p-3 gap-0.5">
                    {CATEGORIES.map(cat => (
                      <Link
                        key={cat.name}
                        href={cat.href}
                        role="menuitem"
                        onClick={() => setCatOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#fce4e4] transition-colors group"
                      >
                        <span className="text-2xl shrink-0" aria-hidden="true">{cat.icon}</span>
                        <div className="min-w-0">
                          <strong className="block text-[13px] font-semibold text-gray-900 leading-tight group-hover:text-[#B71C1C] transition-colors truncate">
                            {cat.name}
                          </strong>
                          <span className="block text-[11px] text-gray-500 leading-tight mt-0.5 truncate">
                            {cat.sub}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Global search — GET form submitting to /properties */}
            <form
              method="GET"
              action="/properties"
              className="hidden md:flex flex-1 items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50 focus-within:border-[#B71C1C] focus-within:bg-white transition-colors h-9"
            >
              <input
                type="text"
                name="search"
                placeholder="Search properties, services, materials..."
                className="flex-1 px-4 h-full text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400 min-w-0"
              />
              <button
                type="submit"
                aria-label="Search"
                className="flex items-center justify-center w-10 h-full bg-[#B71C1C] hover:bg-[#9c1414] text-white transition-colors shrink-0"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
            </form>

            {/* Mobile: compact auth + hamburger (topbar is hidden on mobile) */}
            <div className="ml-auto flex items-center gap-2 md:hidden">
              <Link href="/login"    className="text-sm font-medium text-gray-700 hover:text-[#B71C1C] transition-colors whitespace-nowrap">Sign In</Link>
              <Link href="/register" className="inline-flex items-center px-3 py-1.5 rounded-md bg-[#B71C1C] hover:bg-[#9c1414] text-white text-sm font-semibold transition-colors whitespace-nowrap">
                Join
              </Link>
              <button
                onClick={() => setMobileOpen(o => !o)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                className="ml-1 p-1 bg-transparent border-none cursor-pointer flex flex-col gap-[5px] shrink-0"
              >
                <span className={`block w-[22px] h-[2px] bg-gray-700 rounded transition-all duration-200 ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
                <span className={`block w-[22px] h-[2px] bg-gray-700 rounded transition-all duration-200 ${mobileOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-[22px] h-[2px] bg-gray-700 rounded transition-all duration-200 ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
              </button>
            </div>

          </div>
        </header>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE DRAWER — rendered outside sticky container so z-index is
          scoped to the document root, not the header's stacking context.
      ═══════════════════════════════════════════════════════════════════════ */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[70] bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in panel */}
          <nav
            className="fixed top-0 right-0 h-full z-[80] bg-white shadow-2xl overflow-y-auto md:hidden"
            style={{ width: 'min(320px, 90vw)' }}
            aria-label="Mobile navigation"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#B71C1C] sticky top-0 z-10">
              <Link href="/" onClick={() => setMobileOpen(false)} className="text-[18px] font-extrabold">
                <span className="text-white">LANDLORD</span>
                <span style={{ color: '#ffb3b3' }}>ZS</span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="w-8 h-8 rounded-full bg-white/20 border-none text-white text-xl flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors leading-none"
              >
                ×
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-gray-100">
              <form method="GET" action="/properties" className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-9">
                <input
                  type="text"
                  name="search"
                  placeholder="Search..."
                  className="flex-1 px-3 h-full text-sm outline-none text-gray-800 placeholder-gray-400 bg-gray-50 min-w-0"
                />
                <button type="submit" aria-label="Search" className="flex items-center justify-center w-9 h-full bg-[#B71C1C] text-white shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                </button>
              </form>
            </div>

            {/* Quick navigation with expandable sections */}
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400 mb-2">Navigation</p>

              {/* For Buyers — expandable */}
              <div className="border-b border-gray-100">
                <button
                  onClick={() => setMobileExpanded(mobileExpanded === 'buyers' ? null : 'buyers')}
                  className="w-full flex items-center justify-between py-2.5 text-[14px] text-gray-700 hover:text-[#B71C1C] transition-colors bg-transparent border-none cursor-pointer text-left"
                >
                  For Buyers
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
                    className={`transition-transform duration-150 shrink-0 ${mobileExpanded === 'buyers' ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {mobileExpanded === 'buyers' && (
                  <div className="pb-2 pl-3 space-y-0">
                    {[...BUYERS_GENERAL, ...BUYERS_ACCOUNT].map(l => (
                      <Link
                        key={l.label}
                        href={l.href}
                        onClick={() => setMobileOpen(false)}
                        className="block py-1.5 text-[13px] text-gray-600 hover:text-[#B71C1C] transition-colors"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* For Sellers — expandable */}
              <div className="border-b border-gray-100">
                <button
                  onClick={() => setMobileExpanded(mobileExpanded === 'sellers' ? null : 'sellers')}
                  className="w-full flex items-center justify-between py-2.5 text-[14px] text-gray-700 hover:text-[#B71C1C] transition-colors bg-transparent border-none cursor-pointer text-left"
                >
                  For Sellers
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
                    className={`transition-transform duration-150 shrink-0 ${mobileExpanded === 'sellers' ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {mobileExpanded === 'sellers' && (
                  <div className="pb-2 pl-3 space-y-0">
                    {[...SELLERS_GENERAL, ...SELLERS_ACCOUNT].map(l => (
                      <Link
                        key={l.label}
                        href={l.href}
                        onClick={() => setMobileOpen(false)}
                        className="block py-1.5 text-[13px] text-gray-600 hover:text-[#B71C1C] transition-colors"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Jobs & Tenders — simple link */}
              <Link
                href="/tenders"
                onClick={() => setMobileOpen(false)}
                className="block py-2.5 text-[14px] text-gray-700 border-b border-gray-100 hover:text-[#B71C1C] transition-colors"
              >
                Jobs & Tenders
              </Link>

              {/* Help — simple link */}
              <Link
                href="/help"
                onClick={() => setMobileOpen(false)}
                className="block py-2.5 text-[14px] text-gray-700 border-b border-gray-100 hover:text-[#B71C1C] transition-colors"
              >
                Help
              </Link>
            </div>

            {/* All Categories */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400 mb-2">All Categories</p>
              {CATEGORIES.map(cat => (
                <Link
                  key={cat.name}
                  href={cat.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 py-2.5 border-b border-gray-100 text-gray-700 hover:text-[#B71C1C] transition-colors"
                >
                  <span className="text-[18px] shrink-0" aria-hidden="true">{cat.icon}</span>
                  <span className="text-[13.5px]">{cat.name}</span>
                </Link>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="px-4 py-5 flex gap-3">
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center py-2.5 rounded-md bg-[#B71C1C] hover:bg-[#9c1414] text-white text-[13px] font-semibold transition-colors"
              >
                Post Free
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center py-2.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-semibold transition-colors"
              >
                Sign In
              </Link>
            </div>

          </nav>
        </>
      )}
    </>
  )
}
