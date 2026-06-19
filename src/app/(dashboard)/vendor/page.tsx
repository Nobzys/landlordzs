import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Store, Wallet, Package, Eye, ShoppingCart, BarChart3, ShieldCheck, Plus, ClipboardList, Megaphone } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { MetricsGrid } from '@/components/dashboard/MetricsGrid'
import { formatXAF } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Vendor Dashboard' }

type VendorProfile = {
  store_name: string
  store_slug: string
  store_description: string | null
  is_verified: boolean
  store_view_count: number
  product_count: number
  order_count: number
}

export default async function VendorPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'vendor') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vendor } = await (supabase as any)
    .from('vendor_profiles')
    .select('store_name, store_slug, store_description, is_verified, store_view_count, product_count, order_count')
    .eq('id', profile.id)
    .single() as { data: VendorProfile | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [
    { data: wallet },
    { count: activeProducts },
    { data: productViewRows },
    { count: pendingOrders },
    { data: monthRevenueRows },
  ] = await Promise.all([
    sb.from('wallets').select('balance, currency').eq('user_id', profile.id).single(),
    sb.from('products').select('id', { count: 'exact', head: true }).eq('vendor_id', profile.id).eq('is_active', true),
    sb.from('products').select('view_count').eq('vendor_id', profile.id),
    sb.from('orders').select('id', { count: 'exact', head: true }).eq('vendor_id', profile.id).eq('status', 'pending'),
    sb.from('orders')
      .select('total')
      .eq('vendor_id', profile.id)
      .eq('payment_status', 'completed')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  const productViews = (productViewRows ?? []).reduce((sum: number, p: { view_count: number }) => sum + p.view_count, 0)
  const monthlyRevenue = (monthRevenueRows ?? []).reduce((sum: number, o: { total: number }) => sum + o.total, 0)

  const displayName = profile.display_name ?? profile.full_name ?? 'there'

  const metrics = [
    { label: 'Store Views', value: vendor?.store_view_count ?? 0, icon: Eye },
    { label: 'Product Views', value: productViews, icon: Eye },
    { label: 'Orders Received', value: vendor?.order_count ?? 0, icon: ShoppingCart },
    { label: 'Verification Status', value: profile.is_verified ? 'Verified' : 'Unverified', icon: ShieldCheck },
    { label: 'Active Products', value: activeProducts ?? 0, icon: Package },
    { label: 'Monthly Revenue', value: formatXAF(monthlyRevenue), icon: BarChart3 },
    { label: 'Wallet Balance', value: wallet ? formatXAF(wallet.balance) : formatXAF(0), icon: Wallet },
    { label: 'Pending Orders', value: pendingOrders ?? 0, icon: ClipboardList },
  ]

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {vendor?.store_name ?? `Welcome, ${displayName}`}
            </h1>
            <p className="text-sm text-muted-foreground">Vendor Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {vendor && (
            <Badge variant="outline" className="text-xs font-mono">
              /{vendor.store_slug}
            </Badge>
          )}
          <LinkButton href="/vendor/store" size="sm">
            <Store className="h-4 w-4 mr-2" />
            Manage Store
          </LinkButton>
        </div>
      </div>

      <MetricsGrid metrics={metrics} />

      {/* Quick actions */}
      <div className="rounded-xl border p-4">
        <h2 className="text-sm font-semibold mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/vendor/products/new" variant="outline" size="sm" className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </LinkButton>
          <LinkButton href="/vendor/products" variant="outline" size="sm" className="gap-2">
            <Package className="h-3.5 w-3.5" />
            Manage Inventory
          </LinkButton>
          <LinkButton href="/vendor/orders" variant="outline" size="sm" className="gap-2">
            <ClipboardList className="h-3.5 w-3.5" />
            View Orders
          </LinkButton>
          <LinkButton href="/vendor/store" variant="outline" size="sm" className="gap-2">
            <Megaphone className="h-3.5 w-3.5" />
            Promote Store
          </LinkButton>
        </div>
      </div>

      {!vendor && (
        <div className="rounded-xl border p-6 text-center">
          <Store className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium mb-1">Store not set up yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Complete your store profile to appear in the materials marketplace.
          </p>
          <LinkButton href="/vendor/store" size="sm">Set Up Store</LinkButton>
        </div>
      )}
    </div>
  )
}
