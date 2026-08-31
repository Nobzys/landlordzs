import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProductGrid } from '@/components/marketplace/ProductGrid'
import type { ProductCardData } from '@/components/marketplace/ProductCard'

export const metadata: Metadata = {
  title: 'Building Materials — Landlordzs',
  description:
    'Browse cement, steel, tiles, and construction products from verified vendors across Cameroon.',
}

const PAGE_SIZE = 12

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>
}

type CategoryRow = { id: string; name: string }

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
  const { q, category, page: pageStr } = await searchParams
  const page   = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE
  const search = q?.trim() || null

  const supabase = await createClient()

  // Build products query with optional filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let productsQuery = (supabase as any)
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

  if (search)   productsQuery = productsQuery.ilike('name', `%${search}%`)
  if (category) productsQuery = productsQuery.eq('category_id', category)

  const [catsRes, productsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('product_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order') as Promise<{ data: CategoryRow[] | null }>,

    productsQuery as Promise<{ data: ProductRow[] | null; count: number | null }>,
  ])

  const categories = catsRes.data ?? []
  const products   = (productsRes.data ?? []) as ProductCardData[]
  const totalCount = productsRes.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  function buildHref(overrides: { q?: string | null; category?: string | null; page?: number }) {
    const params = new URLSearchParams()
    const nq  = 'q' in overrides ? overrides.q : search
    const nc  = 'category' in overrides ? overrides.category : category
    const np  = overrides.page ?? 1
    if (nq)      params.set('q', nq)
    if (nc)      params.set('category', nc)
    if (np > 1)  params.set('page', String(np))
    const qs = params.toString()
    return `/materials${qs ? `?${qs}` : ''}`
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Hero + search */}
      <div className="bg-[#1a0505] py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <h1 className="text-3xl font-bold text-white">
            Building Materials
          </h1>
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
            {category && <input type="hidden" name="category" value={category} />}
            <button
              type="submit"
              className="rounded-md bg-white text-[#B71C1C] px-4 py-2 text-sm font-medium hover:bg-white/90 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Link
              href={buildHref({ category: null, page: 1 })}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                !category
                  ? 'bg-[#B71C1C] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              All
            </Link>
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={buildHref({ category: cat.id, page: 1 })}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  category === cat.id
                    ? 'bg-[#B71C1C] text-white'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Result count */}
        <p className="text-sm text-muted-foreground">
          {totalCount} product{totalCount !== 1 ? 's' : ''}
          {search ? ` matching "${search}"` : ''}
        </p>

        {/* Grid */}
        <ProductGrid
          products={products}
          emptyMessage={
            search
              ? `No products match "${search}".`
              : 'No products are available right now.'
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
    </main>
  )
}
