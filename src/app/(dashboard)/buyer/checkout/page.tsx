import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { createOrder } from '@/lib/actions/orders'
import { formatXAF } from '@/lib/utils/format'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import type { CartItemData } from '@/components/marketplace/CartItem'

export const metadata: Metadata = {
  title: 'Checkout — Landlordzs',
}

interface PageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const { error: errorParam } = await searchParams

  const [supabase, profile] = await Promise.all([
    createClient(),
    getServerProfile(),
  ])

  if (!profile) redirect('/login?redirect=/buyer/checkout')

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

  const items = cartRows ?? []
  if (items.length === 0) redirect('/buyer/cart')

  const total = items.reduce((s, i) => s + (i.products?.price ?? 0) * i.quantity, 0)
  const qty   = items.reduce((s, i) => s + i.quantity, 0)

  // Inline server action — handles result and redirects
  async function submitOrder(formData: FormData) {
    'use server'
    const result = await createOrder(formData)
    if (result.error) {
      redirect(`/buyer/checkout?error=${encodeURIComponent(result.error)}`)
    }
    redirect('/buyer')
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {errorParam && (
        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {decodeURIComponent(errorParam)}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Shipping form */}
        <div className="lg:col-span-2">
          <form action={submitOrder} className="space-y-6">
            <section className="rounded-xl border bg-card p-5 space-y-4">
              <h2 className="font-semibold text-base">Delivery Details</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="shipping_name" className="text-sm font-medium">
                    Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="shipping_name"
                    name="shipping_name"
                    type="text"
                    required
                    placeholder="e.g. Jean-Pierre Mbeki"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="shipping_phone" className="text-sm font-medium">
                    Phone Number <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="shipping_phone"
                    name="shipping_phone"
                    type="tel"
                    required
                    placeholder="e.g. +237 6XX XXX XXX"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="shipping_city" className="text-sm font-medium">
                  City <span className="text-destructive">*</span>
                </label>
                <select
                  id="shipping_city"
                  name="shipping_city"
                  required
                  defaultValue=""
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="" disabled>Select city…</option>
                  {CAMEROON_CITIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="shipping_address" className="text-sm font-medium">
                  Delivery Address <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="shipping_address"
                  name="shipping_address"
                  required
                  rows={3}
                  placeholder="Street, neighbourhood, landmark…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="notes" className="text-sm font-medium">
                  Order Notes <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  placeholder="Any special instructions for your order…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </section>

            <button
              type="submit"
              className="w-full rounded-md bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Place Order
            </button>

            <p className="text-xs text-muted-foreground text-center">
              No payment is charged now. The vendor will confirm your order and arrange payment.
            </p>
          </form>
        </div>

        {/* Cart summary */}
        <div className="lg:col-span-1 order-first lg:order-last">
          <div className="rounded-xl border bg-card p-5 space-y-4 sticky top-4">
            <h2 className="font-semibold text-base">
              Order Summary ({qty} item{qty !== 1 ? 's' : ''})
            </h2>

            <div className="divide-y max-h-64 overflow-y-auto">
              {items.map(item => {
                if (!item.products) return null
                return (
                  <div key={item.id} className="py-2 flex justify-between items-start gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium line-clamp-2">{item.products.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatXAF(item.products.price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 font-medium">
                      {formatXAF(item.products.price * item.quantity)}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="border-t pt-3 flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatXAF(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
