import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShoppingCart } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { CartItem, type CartItemData } from '@/components/marketplace/CartItem'
import { LinkButton } from '@/components/ui/link-button'
import { formatXAF } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'My Cart — Landlordzs',
}

export default async function CartPage() {
  const [supabase, profile] = await Promise.all([
    createClient(),
    getServerProfile(),
  ])

  if (!profile) redirect('/login?redirect=/buyer/cart')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cartRows } = await (supabase as any)
    .from('cart_items')
    .select(`
      id, quantity,
      products:product_id (
        id, name, price, unit, stock_qty,
        product_images(url, is_primary, sort_order),
        vendor_profiles:vendor_id(store_name, store_slug)
      )
    `)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false }) as { data: CartItemData[] | null }

  const items    = cartRows ?? []
  const total    = items.reduce((s, i) => s + (i.products?.price ?? 0) * i.quantity, 0)
  const qty      = items.reduce((s, i) => s + i.quantity, 0)

  if (items.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShoppingCart className="h-14 w-14 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Browse building materials and add products to your cart.
        </p>
        <LinkButton href="/materials">Browse Materials</LinkButton>
      </main>
    )
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Item list */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-card divide-y">
            {items.map(item => (
              <div key={item.id} className="px-4">
                <CartItem item={item} />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Link
              href="/materials"
              className="text-sm text-primary hover:underline"
            >
              ← Continue shopping
            </Link>
          </div>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border bg-card p-5 space-y-4 sticky top-4">
            <h2 className="font-semibold text-base">Order Summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Items ({qty})</span>
                <span>{formatXAF(total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
            </div>

            <div className="border-t pt-3 flex justify-between font-semibold">
              <span>Subtotal</span>
              <span>{formatXAF(total)}</span>
            </div>

            <LinkButton href="/buyer/checkout" className="w-full text-center">
              Proceed to Checkout
            </LinkButton>

            <p className="text-xs text-muted-foreground text-center">
              Payment is collected after vendor confirmation.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
