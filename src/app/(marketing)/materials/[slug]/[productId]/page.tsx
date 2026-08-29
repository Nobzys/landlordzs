import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Package, Star, MapPin, Store, ShieldCheck } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import { formatXAF } from '@/lib/utils/format'
import { CAMEROON_CITIES } from '@/lib/utils/constants'

interface PageProps {
  params:      Promise<{ slug: string; productId: string }>
  searchParams: Promise<{ img?: string }>
}

type ProductDetailRow = {
  id:             string
  name:           string
  name_fr:        string | null
  description:    string | null
  description_fr: string | null
  brand:          string | null
  model:          string | null
  price:          number
  original_price: number | null
  unit:           string
  stock_qty:      number
  min_order_qty:  number
  max_order_qty:  number | null
  specifications: Record<string, unknown>
  tags:           string[]
  rating_avg:     number
  rating_count:   number
  product_images: {
    id:        string
    url:       string
    alt_text:  string | null
    is_primary: boolean
    sort_order: number
  }[]
  vendor_profiles: {
    id:                string
    store_slug:        string
    store_name:        string
    store_logo:        string | null
    city:              string | null
    rating_avg:        number
    rating_count:      number
    is_verified:       boolean
  } | null
  product_categories: { name: string } | null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productId } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('products')
    .select('name, description')
    .eq('id', productId)
    .single() as { data: { name: string; description: string | null } | null }

  if (!data) return { title: 'Product Not Found' }
  return {
    title: `${data.name} — Landlordzs`,
    description: data.description?.slice(0, 160) ?? `Buy ${data.name} on Landlordzs.`,
  }
}

export default async function ProductDetailPage({ params, searchParams }: PageProps) {
  const { slug, productId } = await params
  const { img: imgParam }   = await searchParams

  const [supabase, profile] = await Promise.all([
    createClient(),
    getServerProfile(),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: product } = await (supabase as any)
    .from('products')
    .select(
      `id, name, name_fr, description, description_fr, brand, model,
       price, original_price, unit, stock_qty, min_order_qty, max_order_qty,
       specifications, tags, rating_avg, rating_count,
       product_images(id, url, alt_text, is_primary, sort_order),
       vendor_profiles:vendor_id(id, store_slug, store_name, store_logo, city, rating_avg, rating_count, is_verified),
       product_categories:category_id(name)`
    )
    .eq('id', productId)
    .eq('is_available', true)
    .single() as { data: ProductDetailRow | null }

  // Verify product exists and belongs to the vendor identified by [slug]
  if (!product || product.vendor_profiles?.store_slug !== slug) notFound()

  // Sort images: primary first, then by sort_order
  const sortedImages = [...(product.product_images ?? [])].sort(
    (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order
  )

  const activeIdx  = sortedImages.length > 0
    ? Math.min(Math.max(0, parseInt(imgParam ?? '0', 10) || 0), sortedImages.length - 1)
    : 0
  const mainImage  = sortedImages[activeIdx] ?? null

  const hasDiscount = product.original_price != null && product.original_price > product.price
  const isOutOfStock = product.stock_qty === 0
  const vendor = product.vendor_profiles!
  const cityLabel = CAMEROON_CITIES.find(c => c.value === vendor.city)?.label ?? vendor.city

  const specs = product.specifications
    ? Object.entries(product.specifications).filter(([, v]) => v != null && v !== '')
    : []

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link href="/materials" className="hover:text-foreground transition-colors">
            Materials
          </Link>
          <span>/</span>
          <Link
            href={`/materials/${vendor.store_slug}`}
            className="hover:text-foreground transition-colors"
          >
            {vendor.store_name}
          </Link>
          <span>/</span>
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* ── Image gallery (URL-param driven, server-rendered) ── */}
          <div className="space-y-3">
            {/* Main image */}
            <div className="relative aspect-square rounded-xl border bg-muted overflow-hidden">
              {mainImage ? (
                <Image
                  src={mainImage.url}
                  alt={mainImage.alt_text ?? product.name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground/20" />
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {sortedImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {sortedImages.map((img, idx) => (
                  <Link
                    key={img.id}
                    href={`/materials/${slug}/${productId}?img=${idx}`}
                    replace
                    className={`relative h-16 w-16 shrink-0 rounded-lg border-2 overflow-hidden bg-muted transition-colors ${
                      idx === activeIdx
                        ? 'border-primary'
                        : 'border-transparent hover:border-muted-foreground/40'
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={img.alt_text ?? `${product.name} ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── Product info ── */}
          <div className="space-y-5">
            {product.product_categories?.name && (
              <Badge variant="secondary">{product.product_categories.name}</Badge>
            )}

            <div>
              <h1 className="text-2xl font-bold leading-snug">{product.name}</h1>
              {product.name_fr && (
                <p className="text-sm text-muted-foreground mt-1">{product.name_fr}</p>
              )}
              {product.brand && (
                <p className="text-sm text-muted-foreground">
                  Brand: <span className="font-medium text-foreground">{product.brand}</span>
                  {product.model && ` · ${product.model}`}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold">{formatXAF(product.price)}</span>
              {hasDiscount && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatXAF(product.original_price!)}
                </span>
              )}
              <span className="text-sm text-muted-foreground">/ {product.unit}</span>
            </div>

            {/* Rating */}
            {product.rating_count > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 fill-current text-yellow-500" />
                <span className="font-medium">{product.rating_avg.toFixed(1)}</span>
                <span className="text-muted-foreground">({product.rating_count} reviews)</span>
              </div>
            )}

            {/* Stock + order info */}
            <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Availability</span>
                {isOutOfStock ? (
                  <Badge variant="secondary">Out of stock</Badge>
                ) : (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    In stock ({product.stock_qty})
                  </span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minimum order</span>
                <span>{product.min_order_qty} {product.unit}</span>
              </div>
              {product.max_order_qty != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maximum order</span>
                  <span>{product.max_order_qty} {product.unit}</span>
                </div>
              )}
            </div>

            {/* Add to Cart — stub pending Task 15.2 */}
            {!profile ? (
              <LinkButton
                href={`/login?redirect=/materials/${slug}/${productId}`}
                className="w-full"
              >
                Sign in to purchase
              </LinkButton>
            ) : (
              <button
                disabled
                className="w-full rounded-md bg-primary/50 text-primary-foreground px-4 py-2.5 text-sm font-medium cursor-not-allowed"
                title="Cart coming soon"
              >
                Add to Cart — Coming Soon
              </button>
            )}

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {product.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}

            {/* Vendor card */}
            <Link
              href={`/materials/${vendor.store_slug}`}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent transition-colors"
            >
              <div className="relative h-10 w-10 rounded-lg border bg-muted shrink-0 overflow-hidden">
                {vendor.store_logo ? (
                  <Image
                    src={vendor.store_logo}
                    alt={vendor.store_name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Store className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm truncate">{vendor.store_name}</p>
                  {vendor.is_verified && (
                    <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {vendor.rating_count > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-current text-yellow-500" />
                      {vendor.rating_avg.toFixed(1)}
                    </span>
                  )}
                  {cityLabel && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {cityLabel}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">View store →</span>
            </Link>
          </div>
        </div>

        {/* ── Description + Specifications ── */}
        <div className="mt-10 space-y-8 max-w-3xl">
          {(product.description || product.description_fr) && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Description</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {product.description}
              </p>
              {product.description_fr && product.description_fr !== product.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed mt-3 border-l-2 pl-3">
                  {product.description_fr}
                </p>
              )}
            </section>
          )}

          {specs.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Specifications</h2>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    {specs.map(([key, val]) => (
                      <tr key={key}>
                        <td className="px-4 py-2.5 font-medium text-muted-foreground w-2/5 bg-muted/30">
                          {key}
                        </td>
                        <td className="px-4 py-2.5">{String(val)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
