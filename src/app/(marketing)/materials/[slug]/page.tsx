import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Store, Star, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { ProductGrid } from '@/components/marketplace/ProductGrid'
import type { ProductCardData } from '@/components/marketplace/ProductCard'
import { CAMEROON_CITIES } from '@/lib/utils/constants'

interface PageProps {
  params: Promise<{ slug: string }>
}

type VendorRow = {
  id:                string
  store_slug:        string
  store_name:        string
  store_logo:        string | null
  store_banner:      string | null
  store_description: string | null
  city:              string | null
  rating_avg:        number
  rating_count:      number
  is_verified:       boolean
  product_count:     number
}

type ProductRow = {
  id:               string
  name:             string
  price:            number
  original_price:   number | null
  unit:             string
  stock_qty:        number
  brand:            string | null
  product_images:   { url: string; is_primary: boolean; sort_order: number }[]
  vendor_profiles:  { store_slug: string; store_name: string } | null
  product_categories: { name: string } | null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase  = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('vendor_profiles')
    .select('store_name, store_description')
    .eq('store_slug', slug)
    .single() as { data: { store_name: string; store_description: string | null } | null }

  if (!data) return { title: 'Store Not Found' }
  return {
    title: `${data.store_name} — Landlordzs`,
    description: data.store_description ?? `Browse products from ${data.store_name}.`,
  }
}

export default async function VendorStorePage({ params }: PageProps) {
  const { slug } = await params
  const supabase  = await createClient()

  // Fetch vendor by store_slug — vendor_select RLS allows public read
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vendor } = await (supabase as any)
    .from('vendor_profiles')
    .select(
      'id, store_slug, store_name, store_logo, store_banner, store_description, ' +
      'city, rating_avg, rating_count, is_verified, product_count'
    )
    .eq('store_slug', slug)
    .single() as { data: VendorRow | null }

  if (!vendor) notFound()

  const cityLabel = CAMEROON_CITIES.find(c => c.value === vendor.city)?.label ?? vendor.city

  // Fetch this vendor's available products (prod_select RLS: is_active for anon)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: productRows } = await (supabase as any)
    .from('products')
    .select(
      `id, name, price, original_price, unit, stock_qty, brand,
       product_images(url, is_primary, sort_order),
       vendor_profiles:vendor_id(store_slug, store_name),
       product_categories:category_id(name)`
    )
    .eq('vendor_id', vendor.id)
    .eq('is_available', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(60) as { data: ProductRow[] | null }

  const products = (productRows ?? []) as ProductCardData[]

  return (
    <main className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative h-40 sm:h-56 bg-muted overflow-hidden">
        {vendor.store_banner ? (
          <Image
            src={vendor.store_banner}
            alt={`${vendor.store_name} banner`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Store header */}
        <div className="flex items-end gap-4 -mt-10 mb-6">
          <div className="relative h-20 w-20 rounded-xl border-4 border-background bg-card shrink-0 overflow-hidden shadow-sm">
            {vendor.store_logo ? (
              <Image
                src={vendor.store_logo}
                alt={vendor.store_name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Store className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
          </div>

          <div className="pb-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{vendor.store_name}</h1>
              {vendor.is_verified && (
                <Badge variant="default" className="text-xs shrink-0">Verified</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
              {vendor.rating_count > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-current text-yellow-500" />
                  {vendor.rating_avg.toFixed(1)}
                  <span className="text-xs">({vendor.rating_count})</span>
                </span>
              )}
              {cityLabel && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {cityLabel}
                </span>
              )}
              <span>
                {vendor.product_count} product{vendor.product_count !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {vendor.store_description && (
          <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
            {vendor.store_description}
          </p>
        )}

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
          <Link href="/materials" className="hover:text-foreground transition-colors">
            Materials
          </Link>
          <span>/</span>
          <span className="text-foreground">{vendor.store_name}</span>
        </nav>

        {/* Products */}
        <ProductGrid
          products={products}
          emptyMessage={`${vendor.store_name} has no available products yet.`}
        />

        <div className="py-8" />
      </div>
    </main>
  )
}
