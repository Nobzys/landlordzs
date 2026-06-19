import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Plus, Eye, Edit, Trash2, ToggleRight, Package, ShoppingCart, Layers, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { MetricsGrid } from '@/components/dashboard/MetricsGrid'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { deleteProduct, toggleProductActive } from '@/lib/actions/marketplace'
import { formatXAF, formatDate } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Products — Vendor' }

type ProductRow = {
  id: string
  name: string
  price: number
  stock_qty: number
  is_active: boolean
  view_count: number
  order_count: number
  created_at: string
}

export default async function VendorProductsPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'vendor') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: products } = await (supabase as any)
    .from('products')
    .select('id, name, price, stock_qty, is_active, view_count, order_count, created_at')
    .eq('vendor_id', profile.id)
    .order('created_at', { ascending: false }) as { data: ProductRow[] | null }

  const list = products ?? []
  const activeCount = list.filter((p) => p.is_active).length
  const lowStockCount = list.filter((p) => p.stock_qty <= 5).length
  const totalViews = list.reduce((sum, p) => sum + p.view_count, 0)
  const totalOrders = list.reduce((sum, p) => sum + p.order_count, 0)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">{list.length} total</p>
        </div>
        <LinkButton href="/vendor/products/new">
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </LinkButton>
      </div>

      <MetricsGrid
        metrics={[
          { icon: Package, label: 'Active Products', value: activeCount },
          { icon: Eye, label: 'Total Views', value: totalViews },
          { icon: ShoppingCart, label: 'Total Orders', value: totalOrders },
          { icon: AlertTriangle, label: 'Low Stock (≤5)', value: lowStockCount },
        ]}
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="You haven't added any products yet."
          ctaLabel="Add your first product"
          ctaHref="/vendor/products/new"
        />
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <div key={p.id} className="flex items-center gap-4 rounded-xl border p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{p.name}</p>
                  <Badge variant={p.is_active ? 'default' : 'secondary'} className="shrink-0 text-xs">
                    {p.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {p.stock_qty <= 5 && (
                    <Badge variant="outline" className="shrink-0 text-xs text-amber-700">Low Stock</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatXAF(p.price)} · {p.stock_qty} in stock · {formatDate(p.created_at)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.view_count} views · {p.order_count} orders
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <LinkButton variant="ghost" size="icon" title="Edit" href={`/vendor/products/${p.id}/edit`}>
                  <Edit className="h-4 w-4" />
                </LinkButton>

                <form action={async () => {
                  'use server'
                  await toggleProductActive(p.id, !p.is_active)
                }}>
                  <Button variant="ghost" size="icon" type="submit" title={p.is_active ? 'Deactivate' : 'Activate'}>
                    <ToggleRight className="h-4 w-4" />
                  </Button>
                </form>

                <form action={async () => {
                  'use server'
                  await deleteProduct(p.id)
                }}>
                  <Button variant="ghost" size="icon" type="submit" title="Delete" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
