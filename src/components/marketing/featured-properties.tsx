import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatXAF } from '@/lib/utils/format'
import { FavoriteButton } from '@/components/properties/FavoriteButton'

// Phase 16.3 — Featured Properties section (Option B: owner/agent + license).
//
// Data strategy: three separate queries merged in application code.
// The properties→profiles FK relationship is not in the Supabase schema cache,
// so PostgREST embedded resource syntax cannot be used for that join.
//
// Query 1: properties + property_images (scalar columns only, no profile embed)
// Query 2: profiles — fetched by the owner_id / agent_id UUIDs from query 1
// Query 3: agent_profiles — fetched by the agent_id UUIDs from query 1
//
// Verification badge: displayed ONLY when properties.is_verified = true.
// "Licensed Agent" label: displayed ONLY when agent_profiles.license_verified = true.
// FavoriteButton: reuses existing component; redirects anon users to /login.

// ─── Types ───────────────────────────────────────────────────────────────────

type ProfileInfo = {
  id:           string
  full_name:    string | null
  display_name: string | null
  avatar_url:   string | null
  is_verified:  boolean
}

// Raw row from the properties query (no embedded profile objects)
type PropertyRow = {
  id:           string
  title:        string
  price:        number | null
  city:         string | null
  listing_type: 'sale' | 'rent' | 'short_term'
  bedrooms:     number | null
  bathrooms:    number | null
  is_verified:  boolean
  is_featured:  boolean
  created_at:   string
  owner_id:     string
  agent_id:     string | null
  property_images: { url: string; is_primary: boolean; sort_order: number }[]
}

// Enriched type used in rendering — profiles and license status merged in
type FeaturedProperty = PropertyRow & {
  owner:                ProfileInfo | null
  agent:                ProfileInfo | null
  agentLicenseVerified: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LISTING_LABELS = {
  sale:       'For Sale',
  rent:       'For Rent',
  short_term: 'Shortlet',
} as const

const LISTING_BADGE = {
  sale:       'bg-[#B71C1C] text-white',
  rent:       'bg-emerald-600 text-white',
  short_term: 'bg-amber-500 text-white',
} as const

// ─── Data fetching ───────────────────────────────────────────────────────────

async function getFeaturedProperties(): Promise<FeaturedProperty[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createClient() as any

    // ── Step 1: properties + images (no profile embed) ───────────────────────
    const { data: rows, error: propsError } = await supabase
      .from('properties')
      .select(`
        id, title, price, city, listing_type, bedrooms, bathrooms,
        is_verified, is_featured, created_at,
        owner_id, agent_id,
        property_images(url, is_primary, sort_order)
      `)
      .eq('status', 'active')
      .in('listing_type', ['sale', 'rent'])
      .order('created_at', { ascending: false })
      .limit(4)

    if (propsError) {
      console.error('[FeaturedProperties] properties query error:', propsError)
      return []
    }

    const props = (rows ?? []) as PropertyRow[]
    if (props.length === 0) return []

    // ── Step 2: batch-fetch profiles for all owner_ids + agent_ids ───────────
    const ownerIds = props.map(p => p.owner_id)
    const agentIds = props.map(p => p.agent_id).filter((id): id is string => id != null)
    const allProfileIds = [...new Set([...ownerIds, ...agentIds])]

    const profileMap = new Map<string, ProfileInfo>()
    if (allProfileIds.length > 0) {
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, display_name, avatar_url, is_verified')
        .in('id', allProfileIds)

      if (profileError) {
        console.error('[FeaturedProperties] profiles query error:', profileError)
      } else {
        for (const row of (profileRows ?? [])) {
          profileMap.set(row.id, row as ProfileInfo)
        }
      }
    }

    // ── Step 3: batch-fetch agent license status ──────────────────────────────
    const licenseMap = new Map<string, boolean>()
    if (agentIds.length > 0) {
      const { data: agentProfRows, error: agentProfError } = await supabase
        .from('agent_profiles')
        .select('id, license_verified')
        .in('id', agentIds)

      if (agentProfError) {
        console.error('[FeaturedProperties] agent_profiles query error:', agentProfError)
      } else {
        for (const row of (agentProfRows ?? [])) {
          licenseMap.set(row.id, row.license_verified === true)
        }
      }
    }

    // ── Step 4: assemble enriched results ────────────────────────────────────
    return props.map(p => ({
      ...p,
      owner:                profileMap.get(p.owner_id) ?? null,
      agent:                p.agent_id ? (profileMap.get(p.agent_id) ?? null) : null,
      agentLicenseVerified: p.agent_id ? (licenseMap.get(p.agent_id) ?? false) : false,
    }))
  } catch (err) {
    console.error('[FeaturedProperties] unexpected error:', err)
    return []
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDisplayName(
  p: { full_name: string | null; display_name: string | null } | null
): string | null {
  if (!p) return null
  return p.display_name?.trim() || p.full_name?.trim() || null
}

// ─── Micro-icons (inline SVG — no external lib dependency) ───────────────────

function ImagePlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#fce4e4]">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#B71C1C" strokeWidth="1.5" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
      <span className="mt-2 text-xs font-medium" style={{ color: '#B71C1C' }}>No photo</span>
    </div>
  )
}

function MapPinMini() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function BedMini() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
      <path d="M2 4v16M22 8V4H2v4M2 8h20v12H2z" />
    </svg>
  )
}

function BathMini() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
      <path d="M9 6L9 2M15 6V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v3" />
      <rect width="18" height="10" x="3" y="6" rx="2" />
      <path d="M5 20v-4M19 20v-4" />
    </svg>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default async function FeaturedProperties() {
  const properties = await getFeaturedProperties()

  return (
    <section className="py-16 md:py-20 bg-gray-50">
      <div className="max-w-[1280px] mx-auto px-5">

        {/* Section header */}
        <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h2
              className="font-extrabold text-[#222222] tracking-[-0.5px]"
              style={{ fontSize: 'clamp(20px, 2.2vw, 28px)' }}
            >
              Featured Properties
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Freshly listed properties for sale and rent across Cameroon
            </p>
          </div>
          <Link
            href="/properties"
            className="text-[13.5px] font-semibold whitespace-nowrap hover:underline"
            style={{ color: '#B71C1C' }}
          >
            View All Properties →
          </Link>
        </div>

        {/* Empty state */}
        {properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-gray-300 bg-white">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#fce4e4' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B71C1C" strokeWidth="1.5" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <p className="font-semibold text-gray-800 mb-1">No properties listed yet</p>
            <p className="text-sm text-gray-500 mb-6 max-w-[280px]">
              Be the first to post a property on LANDLORDZS — it&apos;s free.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center px-5 py-2.5 rounded-md font-semibold text-sm text-white bg-[#B71C1C] hover:bg-[#7f1111] transition-colors"
            >
              Post a Property Free
            </Link>
          </div>
        ) : (
          /* 4-column grid: 1-col mobile, 2-col tablet, 4-col desktop */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {properties.map(property => {
              const imgs = property.property_images ?? []
              const primaryImg =
                imgs.find(i => i.is_primary) ??
                [...imgs].sort((a, b) => a.sort_order - b.sort_order)[0] ??
                null

              const label    = LISTING_LABELS[property.listing_type] ?? 'Listing'
              const badgeCls = LISTING_BADGE[property.listing_type]  ?? 'bg-gray-600 text-white'

              // Agent takes priority over owner for display; fall back to owner.
              const displayPerson = property.agent ?? property.owner
              const name          = getDisplayName(displayPerson)
              // "Licensed Agent" only when agent_profiles.license_verified = true.
              const licensed      = property.agentLicenseVerified

              return (
                /* Card wrapper: relative div so the overlay link + FavoriteButton
                   can be positioned independently without nesting interactive
                   elements inside each other (HTML accessibility). */
                <div
                  key={property.id}
                  className="group relative flex flex-col rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-[3px] transition-all duration-200"
                >
                  {/* Full-card navigation link — behind action buttons (z-[1]) */}
                  <Link href={`/properties/${property.id}`} className="absolute inset-0 z-[1]">
                    <span className="sr-only">{property.title}</span>
                  </Link>

                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    {primaryImg ? (
                      <Image
                        src={primaryImg.url}
                        alt={property.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <ImagePlaceholder />
                    )}

                    {/* Listing type + verified badges — top left */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${badgeCls}`}>
                        {label}
                      </span>
                      {/* Verified badge: shown ONLY when properties.is_verified = true */}
                      {property.is_verified && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Verified
                        </span>
                      )}
                    </div>

                    {/* FavoriteButton — top right, above the overlay link (z-[2]).
                        Guests use localStorage wishlist; authenticated users use DB. */}
                    <div className="absolute top-2 right-2 z-[2]">
                      <FavoriteButton propertyId={property.id} size="sm" />
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-4 gap-1.5">
                    <h3 className="text-[14px] font-bold text-gray-900 leading-snug line-clamp-2">
                      {property.title}
                    </h3>

                    {property.city && (
                      <div className="flex items-center gap-1 text-[12px] text-gray-500 capitalize">
                        <MapPinMini />
                        {property.city}
                      </div>
                    )}

                    {((property.bedrooms ?? 0) > 0 || (property.bathrooms ?? 0) > 0) && (
                      <div className="flex items-center gap-3 text-[12px] text-gray-500">
                        {(property.bedrooms ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <BedMini />
                            {property.bedrooms} bed
                          </span>
                        )}
                        {(property.bathrooms ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <BathMini />
                            {property.bathrooms} bath
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price in Deep Red per Phase 16 design */}
                    <p
                      className="mt-auto pt-2 text-[15px] font-extrabold leading-tight"
                      style={{ color: '#B71C1C' }}
                    >
                      {property.price != null
                        ? formatXAF(property.price)
                        : 'Price on request'}
                    </p>

                    {/* Owner/agent name + "Licensed Agent" label.
                        Only rendered when a name is available from the DB.
                        "Licensed Agent" only when agent_profiles.license_verified = true. */}
                    {name && (
                      <div className="pt-1.5 border-t border-gray-100">
                        <p className="text-[11px] text-gray-600 truncate">{name}</p>
                        {licensed && (
                          <p className="text-[10px] font-semibold" style={{ color: '#B71C1C' }}>
                            Licensed Agent
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </section>
  )
}
