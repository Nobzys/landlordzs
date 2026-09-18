import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProductGrid } from '@/components/marketplace/ProductGrid'
import type { ProductCardData } from '@/components/marketplace/ProductCard'
import { CAMEROON_CITIES } from '@/lib/utils/constants'

export const metadata: Metadata = {
  title: 'Building Materials — Landlordzs',
  description:
    'Browse cement, steel, tiles, and construction products from verified vendors across Cameroon.',
}

const PAGE_SIZE = 12

const CAT_EMOJI: Record<string, string> = {
  'cement-concrete':    '🏗️',
  'steel-metal':        '🔩',
  'timber-wood':        '🪵',
  'bricks-blocks':      '🧱',
  'roofing':            '🏠',
  'tiles-flooring':     '🟫',
  'paint-coatings':     '🎨',
  'plumbing-supplies':  '🔧',
  'electrical-supplies':'⚡',
  'tools-equipment':    '🔨',
  'doors-windows':      '🚪',
  'sanitary-ware':      '🚿',
  'sand-gravel':        '🪨',
  'solar-equipment':    '☀️',
}

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>
}

type CategoryRow = { id: string; name: string; slug: string }

type VendorRow = {
  id:           string
  store_name:   string
  store_slug:   string
  city:         string | null
  rating_avg:   number | null
  rating_count: number | null
  is_verified:  boolean
  product_count: number | null
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

export default async function MaterialsPage({ searchParams }: PageProps) {
  const { q, category: categorySlug, page: pageStr } = await searchParams
  const page   = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE
  const search = q?.trim() || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  // Fetch all categories + resolve active category slug to UUID (parallel)
  const [catsRes, vendorsRes] = await Promise.all([
    supabase
      .from('product_categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('sort_order') as Promise<{ data: CategoryRow[] | null }>,

    supabase
      .from('vendor_profiles')
      .select('id, store_name, store_slug, city, rating_avg, rating_count, is_verified, product_count')
      .order('is_verified', { ascending: false })
      .order('rating_avg',  { ascending: false })
      .limit(6) as Promise<{ data: VendorRow[] | null }>,
  ])

  const categories = catsRes.data  ?? []
  const vendors    = vendorsRes.data ?? []

  // Resolve slug → category UUID for product filtering
  const activeCat = categorySlug
    ? categories.find(c => c.slug === categorySlug) ?? null
    : null

  // Build products query
  let productsQuery = supabase
    .from('products')
    .select(
      `id, name, price, original_price, unit, stock_qty, brand,
       product_images(url, is_primary, sort_order),
       vendor_profiles:vendor_id(store_slug, store_name),
       product_categories:category_id(name)`,
      { count: 'exact' }
    )
    .eq('is_available', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (search)             productsQuery = productsQuery.ilike('name', `%${search}%`)
  if (activeCat)          productsQuery = productsQuery.eq('category_id', activeCat.id)

  const productsRes = await productsQuery as { data: ProductRow[] | null; count: number | null }

  const products   = (productsRes.data ?? []) as ProductCardData[]
  const totalCount = productsRes.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  function buildHref(overrides: { q?: string | null; category?: string | null; page?: number }) {
    const params = new URLSearchParams()
    const nq = 'q'        in overrides ? overrides.q        : search
    const nc = 'category' in overrides ? overrides.category : categorySlug
    const np = overrides.page ?? 1
    if (nq)     params.set('q', nq)
    if (nc)     params.set('category', nc)
    if (np > 1) params.set('page', String(np))
    const qs = params.toString()
    return `/materials${qs ? `?${qs}` : ''}`
  }

  return (
    <main className="min-h-screen bg-background">

      {/* ── Hero + search ── */}
      <div className="bg-gradient-to-br from-[#1a0505] via-[#420e0e] to-[#7f1111] py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <h1 className="text-3xl font-bold text-white">Building Materials Marketplace</h1>
          <p className="text-white/80 max-w-xl">
            Cement, steel, tiles, and construction products from verified vendors across Cameroon.
          </p>
          <form method="GET" action="/materials" className="flex gap-2 max-w-xl">
            <input
              type="text"
              name="q"
              defaultValue={search ?? ''}
              placeholder="Search products…"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
            <button
              type="submit"
              className="rounded-md bg-white text-[#B71C1C] px-4 py-2 text-sm font-medium hover:bg-white/90 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* ── Browse by Category ── */}
      <section className="bg-white py-10 px-4 border-b">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Browse by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/materials?category=${cat.slug}`}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:border-[#B71C1C] hover:shadow-sm group ${
                  categorySlug === cat.slug
                    ? 'border-[#B71C1C] bg-[#fce4e4]'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <span className="text-2xl" aria-hidden="true">
                  {CAT_EMOJI[cat.slug] ?? '📦'}
                </span>
                <span className={`text-[12px] font-semibold text-center leading-tight group-hover:text-[#B71C1C] transition-colors ${
                  categorySlug === cat.slug ? 'text-[#B71C1C]' : 'text-gray-800'
                }`}>
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product results — only rendered when a search or category filter is active ── */}
      {(search || categorySlug) && (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          {/* Result count */}
          <p className="text-sm text-muted-foreground">
            {totalCount} product{totalCount !== 1 ? 's' : ''}
            {search ? ` matching "${search}"` : ''}
            {activeCat ? ` in ${activeCat.name}` : ''}
          </p>

          {/* Grid */}
          <ProductGrid
            products={products}
            emptyMessage={
              search
                ? `No products match "${search}".`
                : `No products listed yet in ${activeCat?.name ?? 'this category'}.`
            }
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={buildHref({ page: page - 1 })}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={buildHref({ page: page + 1 })}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Featured Vendors ── */}
      <section className="bg-gray-50 py-12 px-4 border-t">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Featured Vendors</h2>
              <p className="text-sm text-gray-500 mt-1">
                Verified material suppliers serving Cameroon
              </p>
            </div>
            <Link
              href="/materials/vendors"
              className="inline-flex items-center rounded-md bg-[#B71C1C] hover:bg-[#9b1515] text-white px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors"
            >
              All Vendors →
            </Link>
          </div>

          {vendors.length === 0 ? (
            <div className="text-center py-16 border rounded-xl bg-white text-muted-foreground">
              <p className="font-medium">No vendors listed yet.</p>
              <p className="text-sm mt-1">Be the first to register as a verified vendor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map(vendor => {
                const cityLabel = vendor.city
                  ? (CAMEROON_CITIES.find(c => c.value === vendor.city)?.label ?? vendor.city)
                  : null
                const rating = vendor.rating_avg ?? 0
                const ratingCount = vendor.rating_count ?? 0
                const productCount = vendor.product_count ?? 0

                return (
                  <div
                    key={vendor.id}
                    className="rounded-xl border bg-white p-5 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-semibold text-gray-900 leading-tight truncate">
                            {vendor.store_name}
                          </h3>
                          {vendor.is_verified && (
                            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-[#B71C1C] shrink-0">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Verified
                            </span>
                          )}
                        </div>
                        {cityLabel && (
                          <p className="text-xs text-gray-500 mt-0.5">{cityLabel}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                        {rating > 0 ? rating.toFixed(1) : '—'}
                        {ratingCount > 0 && ` (${ratingCount})`}
                      </span>
                      <span>{productCount} product{productCount !== 1 ? 's' : ''}</span>
                    </div>

                    <Link
                      href={`/materials/${vendor.store_slug}`}
                      className="mt-auto inline-flex items-center justify-center rounded-md bg-[#B71C1C] hover:bg-[#9b1515] text-white px-4 py-2 text-sm font-semibold transition-colors"
                    >
                      Visit Store
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Become a Verified Vendor ── */}
      <section className="px-4 py-0">
        <div className="max-w-7xl mx-auto py-10">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #7f1111 0%, #B71C1C 60%, #c62828 100%)' }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-6 py-10 md:px-12">
              <div className="text-center sm:text-left">
                <p
                  className="text-[11px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  For Suppliers
                </p>
                <h2
                  className="font-extrabold text-white leading-snug"
                  style={{ fontSize: 'clamp(18px, 2.5vw, 26px)' }}
                >
                  Become a Verified Vendor
                </h2>
                <p
                  className="text-[14px] mt-2 max-w-[420px]"
                  style={{ color: 'rgba(255,255,255,0.80)' }}
                >
                  List your building materials and reach thousands of contractors, builders, and
                  homeowners across Cameroon — from Douala and Yaoundé to every major city.
                </p>
              </div>
              <Link
                href="/register?role=vendor"
                className="shrink-0 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white font-bold text-[14px] whitespace-nowrap hover:bg-gray-100 transition-colors"
                style={{ color: '#B71C1C' }}
              >
                Register as Vendor →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-gray-50 py-12 px-4 border-t">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                emoji: '🔍',
                title: 'Find Materials',
                desc: 'Search or browse by category to find the construction materials you need from our verified vendor network.',
              },
              {
                step: '2',
                emoji: '⚖️',
                title: 'Compare Vendors',
                desc: 'View vendor profiles, compare prices, read ratings, and choose the best supplier for your project.',
              },
              {
                step: '3',
                emoji: '🚚',
                title: 'Place Order & Deliver',
                desc: 'Contact the vendor directly to confirm your order and arrange delivery to your construction site.',
              },
            ].map(item => (
              <div key={item.step} className="bg-white rounded-xl border p-6 text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#fce4e4] mb-1">
                  <span className="text-2xl" aria-hidden="true">{item.emoji}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#B71C1C] text-white text-[11px] font-bold shrink-0">
                    {item.step}
                  </span>
                  <h3 className="font-bold text-gray-900 text-[15px]">{item.title}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  )
}
