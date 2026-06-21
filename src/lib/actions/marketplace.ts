'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { productCreateSchema, storeSettingsSchema, businessSettingsSchema } from '@/lib/validations/marketplace'
import { slugify } from '@/lib/utils/format'
import type { ActionResult } from '@/types/auth'
import type { ProductCreateInput, StoreSettingsInput, BusinessSettingsInput } from '@/lib/validations/marketplace'

async function requireVendor(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: actor } = await (supabase as any)
    .from('profiles').select('role, account_status').eq('id', user.id).single()

  if (!actor || actor.role !== 'vendor') return { error: 'Only vendors can manage products.' }
  if (actor.account_status !== 'active') return { error: 'Your account must be approved before managing products.' }

  return { userId: user.id }
}

// ─── Products ───────────────────────────────────────────────────────────────

export async function createProduct(
  data: ProductCreateInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = productCreateSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const actor = await requireVendor()
  if ('error' in actor) return { error: actor.error }

  const supabase = await createClient()
  const slug = `${slugify(parsed.data.name)}-${Date.now()}`

  const { data: product, error } = await (supabase as any)
    .from('products')
    .insert({ ...parsed.data, vendor_id: actor.userId, slug })
    .select('id')
    .single()

  if (error || !product) return { error: error?.message ?? 'Failed to create product' }

  revalidatePath('/vendor/products')
  revalidatePath('/vendor')
  return { success: true, data: { id: product.id } }
}

export async function updateProduct(
  productId: string,
  data: Partial<ProductCreateInput>
): Promise<ActionResult> {
  const actor = await requireVendor()
  if ('error' in actor) return { error: actor.error }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('products')
    .update(data)
    .eq('id', productId)
    .eq('vendor_id', actor.userId)

  if (error) return { error: error.message }

  revalidatePath('/vendor/products')
  revalidatePath('/vendor')
  return { success: true }
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  const actor = await requireVendor()
  if ('error' in actor) return { error: actor.error }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('vendor_id', actor.userId)

  if (error) return { error: error.message }

  revalidatePath('/vendor/products')
  revalidatePath('/vendor')
  return { success: true }
}

export async function toggleProductActive(productId: string, isActive: boolean): Promise<ActionResult> {
  const actor = await requireVendor()
  if ('error' in actor) return { error: actor.error }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('products')
    .update({ is_active: isActive })
    .eq('id', productId)
    .eq('vendor_id', actor.userId)

  if (error) return { error: error.message }

  revalidatePath('/vendor/products')
  revalidatePath('/vendor')
  return { success: true }
}

export async function adjustStock(
  productId: string,
  delta: number,
  notes?: string
): Promise<ActionResult> {
  const actor = await requireVendor()
  if ('error' in actor) return { error: actor.error }

  const supabase = await createClient()
  const { data: product } = await (supabase as any)
    .from('products')
    .select('stock_qty')
    .eq('id', productId)
    .eq('vendor_id', actor.userId)
    .single()

  if (!product) return { error: 'Product not found' }

  const stockBefore = product.stock_qty
  const stockAfter = Math.max(0, stockBefore + delta)

  const { error } = await (supabase as any)
    .from('products')
    .update({ stock_qty: stockAfter })
    .eq('id', productId)
    .eq('vendor_id', actor.userId)

  if (error) return { error: error.message }

  await (supabase as any).from('inventory_logs').insert({
    product_id: productId,
    change_type: delta >= 0 ? 'restock' : 'adjustment',
    quantity_delta: delta,
    stock_before: stockBefore,
    stock_after: stockAfter,
    notes: notes ?? null,
    created_by: actor.userId,
  })

  revalidatePath('/vendor/products')
  return { success: true }
}

// ─── Product images ─────────────────────────────────────────────────────────

export async function addProductImage(
  productId: string,
  url: string,
  isPrimary = false
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireVendor()
  if ('error' in actor) return { error: actor.error }

  const supabase = await createClient()
  const { data: owns } = await (supabase as any)
    .from('products').select('id').eq('id', productId).eq('vendor_id', actor.userId).single()
  if (!owns) return { error: 'Product not found' }

  if (isPrimary) {
    await (supabase as any).from('product_images').update({ is_primary: false }).eq('product_id', productId)
  }

  const { data, error } = await (supabase as any)
    .from('product_images')
    .insert({ product_id: productId, url, is_primary: isPrimary })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to save image' }

  revalidatePath('/vendor/products')
  return { success: true, data: { id: data.id } }
}

export async function setPrimaryProductImage(imageId: string, productId: string): Promise<ActionResult> {
  const actor = await requireVendor()
  if ('error' in actor) return { error: actor.error }

  const supabase = await createClient()
  const { data: owns } = await (supabase as any)
    .from('products').select('id').eq('id', productId).eq('vendor_id', actor.userId).single()
  if (!owns) return { error: 'Product not found' }

  await (supabase as any).from('product_images').update({ is_primary: false }).eq('product_id', productId)
  const { error } = await (supabase as any).from('product_images').update({ is_primary: true }).eq('id', imageId)
  if (error) return { error: error.message }

  revalidatePath('/vendor/products')
  return { success: true }
}

export async function removeProductImage(imageId: string, productId: string): Promise<ActionResult> {
  const actor = await requireVendor()
  if ('error' in actor) return { error: actor.error }

  const supabase = await createClient()
  const { data: owns } = await (supabase as any)
    .from('products').select('id').eq('id', productId).eq('vendor_id', actor.userId).single()
  if (!owns) return { error: 'Product not found' }

  const { error } = await (supabase as any).from('product_images').delete().eq('id', imageId)
  if (error) return { error: error.message }

  revalidatePath('/vendor/products')
  return { success: true }
}

// ─── Store settings ─────────────────────────────────────────────────────────

export async function updateStoreSettings(data: StoreSettingsInput): Promise<ActionResult> {
  const parsed = storeSettingsSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const actor = await requireVendor()
  if ('error' in actor) return { error: actor.error }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('vendor_profiles')
    .update(parsed.data)
    .eq('id', actor.userId)

  if (error) return { error: error.message }

  revalidatePath('/vendor')
  revalidatePath('/vendor/store')
  return { success: true }
}

export async function updateBusinessSettings(data: BusinessSettingsInput): Promise<ActionResult> {
  const parsed = businessSettingsSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const actor = await requireVendor()
  if ('error' in actor) return { error: actor.error }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('vendor_profiles')
    .update(parsed.data)
    .eq('id', actor.userId)

  if (error) return { error: error.message }

  revalidatePath('/vendor/settings')
  return { success: true }
}

export async function updateStoreImage(field: 'store_logo' | 'store_banner', url: string): Promise<ActionResult> {
  const actor = await requireVendor()
  if ('error' in actor) return { error: actor.error }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('vendor_profiles')
    .update({ [field]: url })
    .eq('id', actor.userId)

  if (error) return { error: error.message }

  revalidatePath('/vendor')
  revalidatePath('/vendor/store')
  return { success: true }
}

// ─── Orders ──────────────────────────────────────────────────────────────────

const VENDOR_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped:   ['delivered'],
}

export async function updateOrderStatus(orderId: string, status: string): Promise<ActionResult> {
  const actor = await requireVendor()
  if ('error' in actor) return { error: actor.error }

  const supabase = await createClient()
  const { data: order } = await (supabase as any)
    .from('orders').select('status').eq('id', orderId).eq('vendor_id', actor.userId).single()
  if (!order) return { error: 'Order not found' }

  const allowed = VENDOR_ORDER_TRANSITIONS[order.status] ?? []
  if (!allowed.includes(status)) return { error: `Cannot move order from ${order.status} to ${status}` }

  const timestampField: Record<string, string> = {
    confirmed: 'confirmed_at',
    shipped:   'shipped_at',
    delivered: 'delivered_at',
    cancelled: 'cancelled_at',
  }

  const { error } = await (supabase as any)
    .from('orders')
    .update({ status, [timestampField[status]]: new Date().toISOString() })
    .eq('id', orderId)
    .eq('vendor_id', actor.userId)

  if (error) return { error: error.message }

  revalidatePath('/vendor/orders')
  revalidatePath('/vendor')
  return { success: true }
}
