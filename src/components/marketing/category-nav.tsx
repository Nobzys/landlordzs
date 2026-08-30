'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type SubItem  = { label: string; href: string; icon: string }
type NavEntry = { id: string; label: string; href: string; subs?: SubItem[] }

// Tracks which dropdown is open + its fixed position in the viewport.
// Using position:fixed (not absolute) so the panel escapes every
// overflow ancestor — specifically the overflow-x:auto on the <ul>.
type DropdownPos = { id: string; top: number; left: number }

// ─── Navigation data ──────────────────────────────────────────────────────────
// Route notes:
// - /properties uses a Zustand filter store; URL ?type= params are NOT consumed
//   by it. All property sub-routes correctly resolve to /properties.
// - /rentals DOES consume ?type=equipment and ?type=vehicle (confirmed).
// - /services, /materials, /jobs, /tenders are confirmed existing public routes.
// - Community has no dedicated page; /register is the nearest existing destination.
// - Agents sub-items all map to /jobs (/professionals does not exist yet).
const NAV_ENTRIES: NavEntry[] = [
  {
    id: 'buy', label: 'Buy Property', href: '/properties',
    subs: [
      { icon: '🏢', label: 'Apartments',       href: '/properties' },
      { icon: '🏠', label: 'Houses & Villas',  href: '/properties' },
      { icon: '🏪', label: 'Commercial Space', href: '/properties' },
      { icon: '💎', label: 'Luxury Homes',     href: '/properties' },
      { icon: '',   label: 'View All →',        href: '/properties' },
    ],
  },
  {
    id: 'rent', label: 'Rent Property', href: '/properties',
    subs: [
      { icon: '🔑', label: 'Rent Apartments',    href: '/properties'             },
      { icon: '🏠', label: 'Rent Houses',        href: '/properties'             },
      { icon: '🛎️', label: 'Short Stay',         href: '/properties'             },
      { icon: '🚜', label: 'Equipment Rentals',  href: '/rentals?type=equipment' },
      { icon: '🚗', label: 'Vehicle Rentals',    href: '/rentals?type=vehicle'   },
      { icon: '',   label: 'View All Rentals →', href: '/rentals'                },
    ],
  },
  {
    id: 'land', label: 'Land & Plots', href: '/properties',
    subs: [
      { icon: '🌾', label: 'Agricultural Land', href: '/properties' },
      { icon: '📍', label: 'Residential Plots', href: '/properties' },
      { icon: '🏗️', label: 'Commercial Land',   href: '/properties' },
      { icon: '',   label: 'View All →',         href: '/properties' },
    ],
  },
  {
    id: 'services', label: 'Services', href: '/services',
    subs: [
      { icon: '🧹', label: 'Cleaning Services', href: '/services' },
      { icon: '🔒', label: 'Security Services', href: '/services' },
      { icon: '🔧', label: 'Home Maintenance',  href: '/services' },
      { icon: '🗑️', label: 'Waste Collection',  href: '/services' },
      { icon: '',   label: 'View All →',          href: '/services' },
    ],
  },
  {
    id: 'materials', label: 'Materials', href: '/materials',
    subs: [
      { icon: '🧱', label: 'Cement & Blocks', href: '/materials' },
      { icon: '🏚️', label: 'Roofing',         href: '/materials' },
      { icon: '⚡',  label: 'Electrical',      href: '/materials' },
      { icon: '🔧', label: 'Plumbing',         href: '/materials' },
      { icon: '',   label: 'View All →',        href: '/materials' },
    ],
  },
  {
    id: 'agents', label: 'Agents', href: '/jobs',
    subs: [
      { icon: '🏷️', label: 'Real Estate Agents',     href: '/jobs' },
      { icon: '🔨', label: 'Contractors',            href: '/jobs' },
      { icon: '📐', label: 'Engineers & Architects', href: '/jobs' },
      { icon: '⚖️', label: 'Property Lawyers',       href: '/jobs' },
      { icon: '',   label: 'View All →',              href: '/jobs' },
    ],
  },
  {
    id: 'community', label: 'Community', href: '/register',
    // No dedicated community page — /register is the nearest existing destination.
  },
]

// ─── Chevron icon ─────────────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="11" height="11" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      aria-hidden="true"
      className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CategoryNav() {
  const [pos,  setPos]  = useState<DropdownPos | null>(null)
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Timer helpers ──────────────────────────────────────────────────────────
  // A 150 ms grace period lets the cursor travel from the trigger button into
  // the fixed-position dropdown without the panel disappearing.

  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  function scheduleClose() {
    clearTimer()
    timerRef.current = setTimeout(() => setPos(null), 150)
  }

  // Calculate viewport-relative position from the <li> and open the dropdown.
  function openDropdown(id: string, li: HTMLElement) {
    clearTimer()
    const rect = li.getBoundingClientRect()
    setPos({ id, top: rect.bottom + 1, left: rect.left })
  }

  // ── Global close handlers ──────────────────────────────────────────────────

  useEffect(() => {
    if (!pos) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setPos(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pos])

  // If the user scrolls while a dropdown is open, close it so the fixed panel
  // does not appear disconnected from the scrolled-away nav bar.
  useEffect(() => {
    if (!pos) return
    function onScroll() { setPos(null) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [pos])

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeEntry = NAV_ENTRIES.find(n => n.id === pos?.id)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Navigation bar ──────────────────────────────────────────────── */}
      <nav aria-label="Category navigation" className="bg-white border-b border-gray-200">
        <div className="max-w-[1280px] mx-auto px-5">
          {/*
            overflow-x-auto enables horizontal scroll on narrow viewports.
            Dropdowns must NOT be rendered inside this element — overflow-x:auto
            implicitly forces overflow-y:auto too, clipping any absolutely-
            positioned children that extend below the element's height.
            The fix: all dropdowns are rendered as fixed siblings to <nav> below.
          */}
          <ul
            role="menubar"
            className="flex items-stretch overflow-x-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          >
            {NAV_ENTRIES.map(item => (
              <li
                key={item.id}
                role="none"
                className="flex-shrink-0"
                onMouseEnter={e => item.subs && openDropdown(item.id, e.currentTarget)}
                onMouseLeave={scheduleClose}
              >
                {item.subs ? (
                  <button
                    role="menuitem"
                    aria-haspopup="true"
                    aria-expanded={pos?.id === item.id}
                    onClick={e => {
                      if (pos?.id === item.id) {
                        setPos(null)
                      } else {
                        openDropdown(item.id, e.currentTarget.closest('li') as HTMLElement)
                      }
                    }}
                    className={[
                      'flex items-center gap-1.5 px-4 h-full py-3 text-[13.5px] font-medium',
                      'whitespace-nowrap transition-colors border-b-2',
                      pos?.id === item.id
                        ? 'text-[#B71C1C] border-[#B71C1C]'
                        : 'text-gray-700 border-transparent hover:text-[#B71C1C] hover:border-[#B71C1C]',
                    ].join(' ')}
                  >
                    {item.label}
                    <Chevron open={pos?.id === item.id} />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    role="menuitem"
                    className="flex items-center px-4 h-full py-3 text-[13.5px] font-medium whitespace-nowrap text-gray-700 hover:text-[#B71C1C] border-b-2 border-transparent hover:border-[#B71C1C] transition-colors"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* ── Dropdown panel — rendered OUTSIDE <nav>, position:fixed ────────
          position:fixed is relative to the viewport and is NOT clipped by any
          ancestor overflow property (unless an ancestor has transform/filter,
          which none of the homepage ancestors do). This guarantees visibility
          regardless of the overflow-x:auto on the <ul> above.
      ────────────────────────────────────────────────────────────────────── */}
      {pos && activeEntry?.subs && (
        <div
          role="menu"
          onMouseEnter={clearTimer}
          onMouseLeave={scheduleClose}
          className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
          style={{
            position: 'fixed',
            top:      pos.top,
            left:     pos.left,
            minWidth: '210px',
            zIndex:   9999,
          }}
        >
          {activeEntry.subs.map(sub => {
            const isViewAll = sub.label.startsWith('View All')
            return (
              <Link
                key={sub.label}
                href={sub.href}
                role="menuitem"
                onClick={() => setPos(null)}
                className={[
                  'flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors',
                  isViewAll
                    ? 'font-semibold text-[#B71C1C] hover:bg-[#fce4e4] border-t border-gray-100'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-[#B71C1C]',
                ].join(' ')}
              >
                {sub.icon && (
                  <span className="text-base shrink-0 w-5 text-center" aria-hidden="true">
                    {sub.icon}
                  </span>
                )}
                {sub.label}
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
