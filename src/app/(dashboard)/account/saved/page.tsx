import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Heart, Users, Building2, ChevronLeft } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { getSavedProfessionals } from '@/lib/actions/saved-professionals'
import { createClient } from '@/lib/supabase/server'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'
import { formatXAF } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Saved Items — LANDLORDZS' }

interface SearchParams { tab?: string }

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  const { tab } = await searchParams
  const activeTab = tab === 'professionals' ? 'professionals' : 'properties'

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/account" className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">Saved Items</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Link
          href="/account/saved"
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
            activeTab === 'properties'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'hover:bg-accent'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Properties
        </Link>
        <Link
          href="/account/saved?tab=professionals"
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
            activeTab === 'professionals'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'hover:bg-accent'
          }`}
        >
          <Users className="h-4 w-4" />
          Professionals
        </Link>
      </div>

      {activeTab === 'properties' && <SavedPropertiesTab userId={profile.id} />}
      {activeTab === 'professionals' && <SavedProfessionalsTab />}
    </div>
  )
}

async function SavedPropertiesTab({ userId }: { userId: string }) {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('property_favorites')
    .select(
      `created_at, properties:property_id (
        id, title, city, neighborhood, price, listing_type, property_type,
        bedrooms, bathrooms, is_featured, is_verified,
        property_images(url, is_primary)
      )`
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false }) as {
      data: { created_at: string; properties: Record<string, unknown> | null }[] | null
    }

  const items = (data ?? []).filter((r) => r.properties).map((r) => r.properties!)

  if (items.length === 0) {
    return (
      <div className="rounded-xl border text-center py-20">
        <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
        <p className="font-medium">No saved properties yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Browse properties and click the heart icon to save them here
        </p>
        <Link href="/properties" className="inline-block mt-4 text-sm text-primary hover:underline">
          Browse properties
        </Link>
      </div>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((p) => {
        const images = (p.property_images as { url: string; is_primary: boolean }[] | null) ?? []
        const hero   = images.find((i) => i.is_primary)?.url ?? images[0]?.url
        const price  = typeof p.price === 'number' ? formatXAF(p.price as number) : null

        return (
          <Link
            key={p.id as string}
            href={`/properties/${p.id}`}
            className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow group"
          >
            <div className="relative h-44 bg-muted">
              {hero ? (
                <Image
                  src={hero}
                  alt={p.title as string}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Building2 className="h-8 w-8 text-muted-foreground opacity-30" />
                </div>
              )}
              <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[11px] font-bold px-2 py-0.5 rounded-md">
                {(p.listing_type as string | null)?.toUpperCase()}
              </span>
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
      })}
    </div>
  )
}

async function SavedProfessionalsTab() {
  const result = await getSavedProfessionals()
  const items  = result.data ?? []

  if (result.error) {
    return <p className="text-sm text-muted-foreground">{result.error}</p>
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border text-center py-20">
        <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
        <p className="font-medium">No saved professionals yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Visit a professional&apos;s profile and save them to track here
        </p>
        <Link href="/professionals" className="inline-block mt-4 text-sm text-primary hover:underline">
          Find professionals
        </Link>
      </div>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {items.map((p) => {
        const displayName = (p.display_name as string | null) ?? (p.full_name as string | null) ?? 'Professional'
        const roleLabel   = ROLE_LABELS[p.role as UserRole] ?? (p.role as string)

        return (
          <Link
            key={p.id as string}
            href={`/professionals/${p.role}/${p.slug}`}
            className="rounded-xl border bg-card p-4 flex items-start gap-3 hover:shadow-md transition-shadow"
          >
            <div className="relative h-12 w-12 rounded-full bg-muted overflow-hidden shrink-0">
              {p.avatar_url ? (
                <Image
                  src={p.avatar_url as string}
                  alt={displayName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-lg font-bold text-muted-foreground">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">{displayName}</p>
                {p.is_premium && (
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    Premium
                  </span>
                )}
                {p.is_verified && (
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
              {p.city && <p className="text-xs text-muted-foreground">{p.city as string}</p>}
              {p.company_name && (
                <p className="text-xs text-muted-foreground truncate">{p.company_name as string}</p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
