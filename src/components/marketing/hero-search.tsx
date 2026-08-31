'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CAMEROON_CITIES } from '@/lib/utils/constants'

// Hero search card — client component.
// Category routing is now handled by the "All Categories" select (first field),
// replacing the tab row that was removed per Phase 16 revision.
//
// Route mapping (same as before, different UI control):
//   properties    → /properties
//   services      → /services
//   materials     → /materials
//   professionals → /jobs  (/professionals has no page yet)
//   rentals       → /rentals
//
// Property Type and Budget fields are conditionally shown only when the
// "Properties" category is active, matching the previous tab behaviour.
//
// Stats are passed as a prop from the parent async server component (hero.tsx),
// which queries real DB counts. They are displayed inside the card, below the
// CTA row, and are never hardcoded.

type StatItem = { label: string; value: string }
type Props    = { stats: StatItem[] }

const CATEGORY_OPTIONS = [
  { value: 'properties',    label: '🏠 All Properties',  route: '/properties' },
  { value: 'services',      label: '🔧 Services',         route: '/services'   },
  { value: 'materials',     label: '🧱 Materials',        route: '/materials'  },
  { value: 'professionals', label: '💼 Professionals',    route: '/jobs'       },
  { value: 'rentals',       label: '🚗 Rentals',          route: '/rentals'    },
]

const PROPERTY_TYPES = [
  { value: '',                 label: 'All Property Types' },
  { value: 'apartment',        label: 'Apartment'           },
  { value: 'house',            label: 'House'               },
  { value: 'villa',            label: 'Villa'               },
  { value: 'studio',           label: 'Studio'              },
  { value: 'duplex',           label: 'Duplex'              },
  { value: 'commercial_space', label: 'Commercial Space'    },
  { value: 'office',           label: 'Office'              },
  { value: 'land',             label: 'Land / Plot'         },
]

const BUDGET_RANGES = [
  { value: '',          label: 'Any Budget'      },
  { value: 'under_5m',  label: 'Under 5M XAF'   },
  { value: '5m_20m',    label: '5M – 20M XAF'   },
  { value: '20m_50m',   label: '20M – 50M XAF'  },
  { value: '50m_100m',  label: '50M – 100M XAF' },
  { value: 'over_100m', label: '100M+ XAF'       },
]

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`

const selectCls = [
  'w-full px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-800',
  'bg-gray-50 focus:outline-none focus:border-[#B71C1C] appearance-none cursor-pointer',
].join(' ')

const selectStyle = {
  backgroundImage:    CHEVRON,
  backgroundRepeat:   'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight:       '36px',
} as const

export default function HeroSearch({ stats }: Props) {
  const router = useRouter()

  const [category, setCategory] = useState('properties')
  const [city,     setCity]     = useState('')
  const [type,     setType]     = useState('')
  const [budget,   setBudget]   = useState('')

  const isProps = category === 'properties'
  const route   = CATEGORY_OPTIONS.find(c => c.value === category)?.route ?? '/properties'

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (city)    params.set('city',   city)
    if (isProps) {
      if (type)   params.set('type',   type)
      if (budget) params.set('budget', budget)
    }
    const qs = params.toString()
    router.push(qs ? `${route}?${qs}` : route)
  }

  return (
    <div
      className="w-full bg-white rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 16px 48px rgba(0,0,0,.28)' }}
    >
      {/* ── Search fields ── */}
      <form onSubmit={handleSearch}>
        <div className="flex flex-wrap gap-3 p-5">

          {/* All Categories */}
          <div className="flex-1 min-w-[155px]">
            <label htmlFor="hero-category" className="sr-only">Category</label>
            <select
              id="hero-category"
              value={category}
              onChange={e => {
                setCategory(e.target.value)
                if (e.target.value !== 'properties') {
                  setType('')
                  setBudget('')
                }
              }}
              className={selectCls}
              style={selectStyle}
            >
              {CATEGORY_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="flex-1 min-w-[155px]">
            <label htmlFor="hero-city" className="sr-only">City / Location</label>
            <select
              id="hero-city"
              value={city}
              onChange={e => setCity(e.target.value)}
              className={selectCls}
              style={selectStyle}
            >
              <option value="">📍 All Cities</option>
              {CAMEROON_CITIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label} — {c.region}
                </option>
              ))}
            </select>
          </div>

          {/* Property Type — Properties category only */}
          {isProps && (
            <div className="flex-1 min-w-[155px]">
              <label htmlFor="hero-type" className="sr-only">Property type</label>
              <select
                id="hero-type"
                value={type}
                onChange={e => setType(e.target.value)}
                className={selectCls}
                style={selectStyle}
              >
                {PROPERTY_TYPES.map(pt => (
                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Budget — Properties category only */}
          {isProps && (
            <div className="flex-1 min-w-[140px]">
              <label htmlFor="hero-budget" className="sr-only">Budget</label>
              <select
                id="hero-budget"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                className={selectCls}
                style={selectStyle}
              >
                {BUDGET_RANGES.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Search button */}
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white text-sm bg-[#B71C1C] hover:bg-[#7f1111] transition-colors whitespace-nowrap shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Search
          </button>
        </div>
      </form>

      {/* ── CTA + Statistics row ── single flex row, stats pushed right via ml-auto ── */}
      {/* On narrow screens flex-wrap causes stats to fall below CTAs cleanly. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pb-4 border-t border-gray-100 pt-3">
        <Link
          href="/register"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md font-semibold text-sm text-white bg-[#B71C1C] hover:bg-[#7f1111] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Post Property Free
        </Link>
        <Link
          href="/register?role=buyer"
          className="inline-flex items-center px-5 py-2.5 rounded-md font-semibold text-sm text-gray-800 border border-gray-300 hover:border-gray-500 hover:bg-gray-50 transition-colors"
        >
          Post Buy Requirement
        </Link>

        {stats.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-1">
            {stats.map((s, i) => (
              <span key={i} className="text-[12px] text-gray-500 whitespace-nowrap">
                <strong className="text-gray-700 font-bold mr-1">{s.value}</strong>
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
