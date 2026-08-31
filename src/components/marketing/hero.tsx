import { createClient } from '@/lib/supabase/server'
import HeroSearch from './hero-search'

// Phase 16 Hero — async server component.
// Fetches real platform stats from the DB and passes them as props to the
// search card (hero-search.tsx), which is a client component so it can use
// React state for category routing. Stats render inside the card, not below it.
//
// Stats shown here are real DB counts — never hardcoded or inflated.
// If a count is 0 (fresh environment), that stat is omitted rather than
// displayed as "0+" which would look broken to real visitors.

const HERO_GRADIENT  = 'linear-gradient(135deg, #1a0505 0%, #420e0e 40%, #6d1515 70%, #8b1a1a 100%)'
const RADIAL_OVERLAY = 'radial-gradient(ellipse at 70% 50%, rgba(183,28,28,.25) 0%, transparent 60%)'

function formatStat(n: number): string {
  if (n >= 10_000) return `${Math.floor(n / 1000)}K+`
  if (n >= 1_000)  return `${parseFloat((n / 1000).toFixed(1))}K+`
  if (n > 0)       return `${n}+`
  return ''
}

async function getPlatformStats() {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    const [propRes, agentRes, proRes] = await Promise.all([
      s.from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      s.from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'agent')
        .eq('account_status', 'active'),
      s.from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['contractor', 'engineer', 'architect', 'lawyer'])
        .eq('account_status', 'active'),
    ])

    return {
      propertyCount:     (propRes.count  as number | null) ?? 0,
      agentCount:        (agentRes.count as number | null) ?? 0,
      professionalCount: (proRes.count   as number | null) ?? 0,
    }
  } catch {
    return { propertyCount: 0, agentCount: 0, professionalCount: 0 }
  }
}

export default async function Hero() {
  const { propertyCount, agentCount, professionalCount } = await getPlatformStats()

  // Only show a stat chip if the value is non-zero — avoids "0+ listings" on
  // a fresh / staging environment, which looks worse than showing nothing.
  const stats = [
    propertyCount     > 0 ? { label: 'Active Listings',    value: formatStat(propertyCount)     } : null,
    agentCount        > 0 ? { label: 'Verified Agents',     value: formatStat(agentCount)        } : null,
    professionalCount > 0 ? { label: 'Professionals',       value: formatStat(professionalCount) } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <section
      style={{ background: HERO_GRADIENT }}
      className="relative min-h-[580px] flex items-center overflow-hidden"
    >
      {/* Radial depth overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: RADIAL_OVERLAY }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-5 py-16">

        {/* ── Hero headline ── */}
        <div className="text-center mb-8 px-2">
          <h1
            className="font-extrabold text-white leading-[1.15] tracking-[-1px] mb-4"
            style={{ fontSize: 'clamp(28px, 4.5vw, 52px)' }}
          >
            Find Your Dream Property<br />
            <span style={{ color: '#ffb3b3' }}>in Cameroon</span>
          </h1>
          <p
            className="max-w-[640px] mx-auto leading-[1.7]"
            style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: 'rgba(255,255,255,.82)' }}
          >
            Buy, Sell, Rent Properties · Hire Professionals · Shop Building Materials ·
            Manage Projects — all from one trusted platform.
          </p>
        </div>

        {/* ── Search card — stats are passed as props and rendered inside the card ── */}
        <HeroSearch stats={stats} />

      </div>
    </section>
  )
}
