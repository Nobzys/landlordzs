import { createClient } from '@/lib/supabase/server'

// Phase 16.2 — Platform trust stats strip.
// Roadmap requirement: show at least 2 real Supabase-sourced stats.
// Zero values are omitted (avoids "0+ properties" on a fresh environment).
// "Free to Join" is always shown as a factual trust signal.

function formatStat(n: number): string {
  if (n >= 10_000) return `${Math.floor(n / 1000)}K+`
  if (n >= 1_000)  return `${parseFloat((n / 1000).toFixed(1))}K+`
  if (n > 0)       return `${n}+`
  return ''
}

async function getTrustStats() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createClient() as any

    const [propRes, cityRes, agentRes] = await Promise.all([
      supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('properties')
        .select('city')
        .eq('status', 'active'),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'agent')
        .eq('account_status', 'active'),
    ])

    const properties = (propRes.count as number | null) ?? 0
    const cities     = cityRes.data
      ? new Set((cityRes.data as { city: string | null }[])
          .map(r => r.city)
          .filter(Boolean)
        ).size
      : 0
    const agents = (agentRes.count as number | null) ?? 0

    return { properties, cities, agents }
  } catch {
    return { properties: 0, cities: 0, agents: 0 }
  }
}

export default async function TrustBar() {
  const { properties, cities, agents } = await getTrustStats()

  const stats = [
    properties > 0 && { value: formatStat(properties), label: 'Properties Listed' },
    cities     > 0 && { value: formatStat(cities),     label: 'Cities Covered'    },
    agents     > 0 && { value: formatStat(agents),     label: 'Verified Agents'   },
                      { value: 'Free',                  label: 'To Join'           },
  ].filter(Boolean) as { value: string; label: string }[]

  return (
    <div className="bg-white border-b border-gray-200 py-5">
      <div className="max-w-[1280px] mx-auto px-5">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 md:gap-x-16">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <span
                className="font-extrabold leading-tight"
                style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', color: '#B71C1C' }}
              >
                {s.value}
              </span>
              <span className="text-[11px] text-gray-500 font-semibold tracking-widest uppercase mt-0.5">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
