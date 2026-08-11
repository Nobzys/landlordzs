import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Edit, ToggleLeft, ToggleRight, Package } from 'lucide-react'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { toggleProductAvailability, deleteProduct } from '@/lib/actions/vendor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { formatXAFShort, formatDate } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'My Products — Vendor' }

const PAGE_SIZE = 10

type ProductRow = {
  id:           string
  name:         string
  slug:         string
  price:        number
  stock_qty:    number
  is_available: boolean
  is_active:    boolean
  created_at:   string
  product_images: { url: string; is_primary: boolean; sort_order: number }[]
}

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function VendorProductsPage({ searchParams }: PageProps) {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'vendor') redirect('/login')
  requireActiveProfile(profile)

  const { page: pageStr } = await searchParams
  const page   = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()

  const [productsRes, countRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('products')
      .select('id, name, slug, price, stock_qty, is_available, is_active, created_at, product_images(url, is_primary, sort_order)')
      .eq('vendor_id', profile.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1) as Promise<{ data: ProductRow[] | null }>,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', profile.id) as Promise<{ count: number | null }>,
  ])

  const products   = productsRes.data ?? []
  const totalCount = countRes.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Products</h1>
          <p className="text-sm text-muted-foreground">{totalCount} total</p>
        </div>
        <LinkButton href="/vendor/products/new">
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </LinkButton>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 border rounded-xl text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium mb-1">No products yet</p>
          <p className="text-sm mb-4">Add your first product to start selling on the marketplace.</p>
          <LinkButton href="/vendor/products/new">Add Product</LinkButton>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden divide-y">
          {products.map(product => {
            const thumb = product.product_images?.find(i => i.is_primary)?.url
              ?? product.product_images?.[0]?.url

            return (
              <div key={product.id} className="flex items-center gap-4 p-4">
                {/* Thumbnail */}
                <div className="h-14 w-14 shrink-0 rounded-lg border overflow-hidden bg-muted flex items-center justify-center">
                  {thumb
                    ? <img src={thumb} alt="" className="h-full w-full object-cover" />
                    : <Package className="h-6 w-6 text-muted-foreground/40" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{product.name}</p>
                    {product.is_available
                      ? <Badge variant="default" className="text-xs shrink-0">Available</Badge>
                      : <Badge variant="secondary" className="text-xs shrink-0">Hidden</Badge>
                    }
                    {!product.is_active && (
                      <Badge variant="destructive" className="text-xs shrink-0">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatXAFShort(product.price)} · {product.stock_qty} in stock · {formatDate(product.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <LinkButton variant="ghost" size="icon" title="Edit" href={`/vendor/products/${product.id}/edit`}>
                    <Edit className="h-4 w-4" />
                  </LinkButton>

                  <form action={async () => {
                    'use server'
                    await toggleProductAvailability(product.id, !product.is_available)
                  }}>
                    <Button
                      type="submit" variant="ghost" size="icon"
                      title={product.is_available ? 'Hide product' : 'Make available'}
                    >
                      {product.is_available
                        ? <ToggleRight className="h-4 w-4 text-primary" />
                        : <ToggleLeft  className="h-4 w-4" />
                      }
                    </Button>
                  </form>

                  <form action={async () => {
                    'use server'
                    await deleteProduct(product.id)
                  }}>
                    <Button
                      type="submit" variant="ghost" size="icon"
                      title="Delete product"
                      className="text-destructive hover:text-destructive"
                      onClick={(e: React.MouseEvent) => {
                        if (!confirm('Delete this product? This cannot be undone.')) e.preventDefault()
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                      </svg>
                    </Button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <LinkButton variant="outline" size="sm" href={`/vendor/products?page=${page - 1}`}>
              Previous
            </LinkButton>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <LinkButton variant="outline" size="sm" href={`/vendor/products?page=${page + 1}`}>
              Next
            </LinkButton>
          )}
        </div>
      )}
    </div>
  )
}
