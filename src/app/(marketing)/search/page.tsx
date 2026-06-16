import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Building2, Users, Store, ArrowRight } from 'lucide-react'
import { globalSearch } from '@/lib/actions/search'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'
import { formatXAF } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Search — LANDLORDZS' }

interface SearchParams { q?: string }

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  const { data } = query.length >= 2 ? await globalSearch(query) : { data: null }

  const hasResults = data && (
    data.properties.length > 0 ||
    data.professionals.length > 0 ||
    data.vendors.length > 0
  )

  return (
    <main className="min-h-screen bg-background">
      {/* Search bar */}
      <div className="bg-blue-700 py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-3xl font-bold text-white">Search LANDLORDZS</h1>
          <form method="get" action="/search" className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              autoFocus
              name="q"
              defaultValue={query}
              placeholder="Search properties, professionals, vendors…"
              className="w-full h-12 pl-12 pr-4 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </form>
          {query && (
            <p className="text-blue-100 text-sm">
              {hasResults
                ? `Results for "${query}"`
                : `No results found for "${query}"`}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        {!query && (
          <div className="grid sm:grid-cols-3 gap-4">
            <Link
              href="/properties"
              className="rounded-xl border bg-card p-6 hover:border-primary/50 transition-colors group"
            >
              <Building2 className="h-8 w-8 text-primary mb-3" />
              <h2 className="font-semibold">Browse Properties</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Find homes, apartments, and commercial spaces
              </p>
              <ArrowRight className="h-4 w-4 mt-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
            <Link
              href="/professionals"
              className="rounded-xl border bg-card p-6 hover:border-primary/50 transition-colors group"
            >
              <Users className="h-8 w-8 text-primary mb-3" />
              <h2 className="font-semibold">Find Professionals</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Agents, contractors, architects, lawyers, and more
              </p>
              <ArrowRight className="h-4 w-4 mt-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
            <Link
              href="/professionals?role=vendor"
              className="rounded-xl border bg-card p-6 hover:border-primary/50 transition-colors group"
            >
              <Store className="h-8 w-8 text-primary mb-3" />
              <h2 className="font-semibold">Browse Vendors</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Building materials, furniture, and services
              </p>
              <ArrowRight className="h-4 w-4 mt-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>
        )}

        {data && (
          <>
            {/* Properties */}
            {data.properties.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Properties
                    <span className="text-sm font-normal text-muted-foreground">
                      ({data.totalProperties} found)
                    </span>
                  </h2>
                  {data.totalProperties > 6 && (
                    <Link
                      href={`/properties?q=${encodeURIComponent(query)}`}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      View all <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.properties.map((p) => (
                    <PropertySearchCard key={p.id as string} property={p} />
                  ))}
                </div>
              </section>
            )}

            {/* Professionals */}
            {data.professionals.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Professionals
                    <span className="text-sm font-normal text-muted-foreground">
                      ({data.totalProfessionals} found)
                    </span>
                  </h2>
                  {data.totalProfessionals > 4 && (
                    <Link
                      href={`/professionals?q=${encodeURIComponent(query)}`}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      View all <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {data.professionals.map((p) => (
                    <ProfileSearchCard key={p.id as string} profile={p} />
                  ))}
                </div>
              </section>
            )}

            {/* Vendors */}
            {data.vendors.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    Vendors
                    <span className="text-sm font-normal text-muted-foreground">
                      ({data.totalVendors} found)
                    </span>
                  </h2>
                  {data.totalVendors > 4 && (
                    <Link
                      href={`/professionals?role=vendor&q=${encodeURIComponent(query)}`}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      View all <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {data.vendors.map((v) => (
                    <ProfileSearchCard key={v.id as string} profile={v} />
                  ))}
                </div>
              </section>
            )}

            {!hasResults && query.length >= 2 && (
              <div className="rounded-xl border text-center py-20">
                <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="font-medium">No results for &ldquo;{query}&rdquo;</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try different keywords or browse by category above
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function PropertySearchCard({ property: p }: { property: Record<string, unknown> }) {
  const images = (p.property_images as { url: string; is_primary: boolean }[] | null) ?? []
  const hero   = images.find((i) => i.is_primary)?.url ?? images[0]?.url
  const listingType = (p.listing_type as string | null)?.toUpperCase() ?? ''
  const price = typeof p.price === 'number' ? formatXAF(p.price as number) : null

  return (
    <Link
      href={`/properties/${p.id}`}
      className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow group"
    >
      <div className="relative h-44 bg-muted">
        {hero ? (
          <Image src={hero} alt={p.title as string} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Building2 className="h-8 w-8 text-muted-foreground opacity-30" />
          </div>
        )}
        <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[11px] font-bold px-2 py-0.5 rounded-md">
          {listingType}
        </span>
        {p.is_featured && (
          <span className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-[11px] font-bold px-2 py-0.5 rounded-md">
            Featured
          </span>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="font-semibold text-sm truncate">{p.title as string}</p>
        <p className="text-xs text-muted-foreground">
          {[p.neighborhood, p.city].filter(Boolean).join(', ')}
        </p>
        {price && <p className="text-sm font-bold text-primary">{price}</p>}
      </div>
    </Link>
  )
}

function ProfileSearchCard({ profile: p }: { profile: Record<string, unknown> }) {
  const displayName = (p.display_name as string | null) ?? (p.full_name as string | null) ?? 'Professional'
  const roleLabel = ROLE_LABELS[p.role as UserRole] ?? (p.role as string)

  return (
    <Link
      href={`/professionals/${p.role}/${p.slug}`}
      className="rounded-xl border bg-card p-4 flex items-start gap-3 hover:shadow-md transition-shadow"
    >
      <div className="relative h-12 w-12 rounded-full bg-muted overflow-hidden shrink-0">
        {p.avatar_url ? (
          <Image src={p.avatar_url as string} alt={displayName} fill className="object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-lg font-bold text-muted-foreground">
            {displayName[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm truncate">{displayName}</p>
          {p.is_premium && (
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              Premium
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{roleLabel}</p>
        {p.city && (
          <p className="text-xs text-muted-foreground mt-0.5">{p.city as string}</p>
        )}
        {p.company_name && (
          <p className="text-xs text-muted-foreground truncate">{p.company_name as string}</p>
        )}
      </div>
    </Link>
  )
}
