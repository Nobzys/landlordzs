'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  addToCartSchema,
  updateCartQuantitySchema,
  removeFromCartSchema,
  shippingSchema,
  cancelOrderSchema,
} from '@/lib/validations/order'

type CartItemRow = {
  id:       string
  quantity: number
  products: {
    id:        string
    name:      string
    price:     number
    vendor_id: string
    vendor_profiles: { id: string; commission_rate: number } | null
  } | null
}

// ─── addToCart ──────────────────────────────────────────────────────────────
export async function addToCart(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = addToCartSchema.safeParse({
    productId: formData.get('productId'),
    variantId: formData.get('variantId') || null,
    quantity:  formData.get('quantity') ?? 1,
  })
  if (!parsed.success) return { error: 'Invalid input' }

  const { productId, variantId, quantity } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: product } = await (supabase as any)
    .from('products')
    .select('stock_qty, min_order_qty, max_order_qty')
    .eq('id', productId)
    .eq('is_available', true)
    .single() as {
      data: { stock_qty: number; min_order_qty: number; max_order_qty: number | null } | null
    }

  if (!product)                return { error: 'Product not available' }
  if (product.stock_qty === 0) return { error: 'Product is out of stock' }
  if (quantity < product.min_order_qty)
    return { error: `Minimum order quantity is ${product.min_order_qty}` }
  if (product.max_order_qty && quantity > product.max_order_qty)
    return { error: `Maximum order quantity is ${product.max_order_qty}` }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('cart_items')
    .upsert(
      { user_id: user.id, product_id: productId, variant_id: variantId ?? null, quantity },
      { onConflict: 'user_id,product_id,variant_id' }
    )

  if (error) return { error: 'Failed to add to cart' }

  revalidatePath('/buyer/cart')
  return { success: true }
}

// ─── updateCartQuantity ─────────────────────────────────────────────────────
export async function updateCartQuantity(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = updateCartQuantitySchema.safeParse({
    cartItemId: formData.get('cartItemId'),
    quantity:   formData.get('quantity'),
  })
  if (!parsed.success) return { error: 'Invalid input' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('cart_items')
    .update({ quantity: parsed.data.quantity })
    .eq('id', parsed.data.cartItemId)
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to update quantity' }

  revalidatePath('/buyer/cart')
  return { success: true }
}

// ─── removeFromCart ─────────────────────────────────────────────────────────
export async function removeFromCart(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = removeFromCartSchema.safeParse({
    cartItemId: formData.get('cartItemId'),
  })
  if (!parsed.success) return { error: 'Invalid input' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('cart_items')
    .delete()
    .eq('id', parsed.data.cartItemId)
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to remove item' }

  revalidatePath('/buyer/cart')
  return { success: true }
}

// ─── createOrder ─────────────────────────────────────────────────────────────
// Groups cart items by vendor and creates one order per vendor.
// Creates a Phase 22 escrow placeholder (status='pending', no payment deducted).
export async function createOrder(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', orderId: null }

  const parsed = shippingSchema.safeParse({
    shipping_name:    formData.get('shipping_name'),
    shipping_phone:   formData.get('shipping_phone'),
    shipping_address: formData.get('shipping_address'),
    shipping_city:    formData.get('shipping_city'),
    notes:            formData.get('notes') || undefined,
  })
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? 'Invalid shipping details', orderId: null }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cartItems } = await (supabase as any)
    .from('cart_items')
    .select(`
      id, quantity,
      products:product_id (
        id, name, price, vendor_id,
        vendor_profiles:vendor_id (id, commission_rate)
      )
    `)
    .eq('user_id', user.id) as { data: CartItemRow[] | null }

  if (!cartItems || cartItems.length === 0)
    return { error: 'Your cart is empty', orderId: null }

  // Group items by vendor so each vendor gets one order row
  type VendorGroup = {
    vendorId:       string
    commissionRate: number
    items: { productId: string; name: string; quantity: number; unitPrice: number }[]
  }
  const groups = new Map<string, VendorGroup>()

  for (const item of cartItems) {
    const product = item.products
    if (!product) continue
    const vendorId       = product.vendor_id
    const commissionRate = product.vendor_profiles?.commission_rate ?? 5

    if (!groups.has(vendorId))
      groups.set(vendorId, { vendorId, commissionRate, items: [] })

    groups.get(vendorId)!.items.push({
      productId: product.id,
      name:      product.name,
      quantity:  item.quantity,
      unitPrice: product.price,
    })
  }

  if (groups.size === 0) return { error: 'Cart contains no valid items', orderId: null }

  const { shipping_name, shipping_phone, shipping_address, shipping_city, notes } = parsed.data
  let firstOrderId: string | null = null

  for (const group of groups.values()) {
    const subtotal   = group.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    const commission = Math.round(subtotal * group.commissionRate / 100)
    const total      = subtotal // shipping_fee deferred to a later phase

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error: orderErr } = await (supabase as any)
      .from('orders')
      .insert({
        buyer_id:        user.id,
        vendor_id:       group.vendorId,
        status:          'pending',
        payment_status:  'pending',
        subtotal,
        shipping_fee:    0,
        discount_amount: 0,
        commission,
        total,
        currency:        'XAF',
        shipping_name,
        shipping_phone,
        shipping_address,
        shipping_city,
        notes:           notes ?? null,
      })
      .select('id')
      .single() as { data: { id: string } | null; error: unknown }

    if (orderErr || !order) return { error: 'Failed to create order', orderId: null }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itemsErr } = await (supabase as any)
      .from('order_items')
      .insert(
        group.items.map(i => ({
          order_id:     order.id,
          product_id:   i.productId,
          product_name: i.name,
          quantity:     i.quantity,
          unit_price:   i.unitPrice,
          total_price:  i.unitPrice * i.quantity,
        }))
      )

    if (itemsErr) return { error: 'Failed to record order items', orderId: null }

    // Phase 22 escrow placeholder — no funds moved, status stays 'pending'
    const platformFeePct = 2.50
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('escrow_accounts')
      .insert({
        reference_type:   'order',
        reference_id:     order.id,
        payer_id:         user.id,
        payee_id:         group.vendorId,
        amount:           total,
        currency:         'XAF',
        platform_fee_pct: platformFeePct,
        platform_fee:     Math.round(total * platformFeePct / 100),
        status:           'pending',
      })

    if (!firstOrderId) firstOrderId = order.id
  }

  // Clear all cart items after successful checkout
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('cart_items')
    .delete()
    .eq('user_id', user.id)

  revalidatePath('/buyer/cart')

  return { success: true, orderId: firstOrderId }
}

// ─── cancelOrder ─────────────────────────────────────────────────────────────
export async function cancelOrder(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = cancelOrderSchema.safeParse({
    orderId: formData.get('orderId'),
  })
  if (!parsed.success) return { error: 'Invalid input' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('orders')
    .update({
      status:       'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.orderId)
    .eq('buyer_id', user.id)

  if (error) return { error: 'Failed to cancel order' }

  return { success: true }
}
