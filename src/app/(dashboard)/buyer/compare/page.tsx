import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, GitCompare, MapPin, BadgeCheck } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { formatXAF } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Compare Properties — Buyer' }

type CompareProperty = {
  id: string
  title: string
  slug: string
  price: number
  listing_type: string
  property_type: string
  city: string
  neighborhood: string | null
  bedrooms: number | null
  bathrooms: number | null
  total_area_sqm: number | null
  is_furnished: boolean
  is_verified: boolean
  property_images: { url: string; order_index: number }[]
}

type CompareRow = {
  label: string
  render: (p: CompareProperty) => ReactNode
}

const ROWS: CompareRow[] = [
  { label: 'Price',         render: (p) => formatXAF(p.price) },
  { label: 'Listing type',  render: (p) => <span className="capitalize">{p.listing_type?.replace('_', ' ')}</span> },
  { label: 'Property type', render: (p) => <span className="capitalize">{p.property_type?.replace('_', ' ')}</span> },
  { label: 'City',          render: (p) => p.city },
  { label: 'Neighborhood',  render: (p) => p.neighborhood ?? '—' },
  { label: 'Bedrooms',      render: (p) => p.bedrooms ?? '—' },
  { label: 'Bathrooms',     render: (p) => p.bathrooms ?? '—' },
  { label: 'Area',          render: (p) => p.total_area_sqm ? `${p.total_area_sqm} m²` : '—' },
  { label: 'Furnished',     render: (p) => p.is_furnished ? 'Yes' : 'No' },
  {
    label: 'Verified',
    render: (p) =>
      p.is_verified ? (
        <BadgeCheck className="h-4 w-4 text-primary" />
      ) : (
        '—'
      ),
  },
]

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}) {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'buyer') redirect('/login')

  const params = await searchParams
  const ids = (params.ids ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)

  if (ids.length === 0) redirect('/buyer/favorites')

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (supabase as any)
    .from('properties')
    .select(`
      id, title, slug, price, listing_type, property_type,
      city, neighborhood, bedrooms, bathrooms, total_area_sqm,
      is_furnished, is_verified,
      property_images ( url, order_index )
    `)
    .in('id', ids) as { data: CompareProperty[] | null }

  const properties = (raw ?? []).map((p) => ({
    ...p,
    property_images: (p.property_images ?? []).slice().sort(
      (a, b) => a.order_index - b.order_index,
    ),
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/buyer/favorites">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GitCompare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Compare Properties</h1>
            <p className="text-sm text-muted-foreground">
              {properties.length} {properties.length === 1 ? 'property' : 'properties'} side-by-side
            </p>
          </div>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-xl border text-center py-16">
          <p className="text-sm text-muted-foreground">No matching properties found.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/properties">Browse Properties</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left text-xs font-semibold text-muted-foreground p-4 w-32 shrink-0 align-bottom">
                  Feature
                </th>
                {properties.map((p) => (
                  <th key={p.id} className="p-4 text-left align-top min-w-[180px]">
                    <Link href={`/properties/${p.slug}`} className="group block space-y-2">
                      <div className="relative h-28 w-full rounded-lg overflow-hidden bg-muted">
                        {p.property_images[0] ? (
                          <Image
                            src={p.property_images[0].url}
                            alt={p.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                            sizes="(max-width: 768px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
                            <MapPin className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <p className="font-medium text-sm line-clamp-2 group-hover:underline">
                        {p.title}
                      </p>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b last:border-0 even:bg-muted/30">
                  <td className="p-4 text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {row.label}
                  </td>
                  {properties.map((p) => (
                    <td key={p.id} className="p-4 font-medium text-sm">
                      {row.render(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
