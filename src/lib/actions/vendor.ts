'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { productSchema } from '@/lib/validations/product'
import { slugify } from '@/lib/utils/format'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import type { ActionResult } from '@/types/auth'
import type { ProductInput } from '@/lib/validations/product'

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createProduct(
  data: ProductInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = productSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role, account_status')
    .eq('id', user.id)
    .single() as { data: { role: string; account_status: string } | null }

  if (!profile || profile.role !== 'vendor') return { error: 'Vendor account required' }
  if (profile.account_status !== 'active') {
    return { error: 'Your account must be approved before creating products.' }
  }

  const { name, category_id, ...rest } = parsed.data
  const slug = `${slugify(name)}-${Date.now()}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: product, error } = await (supabase as any)
    .from('products')
    .insert({
      ...rest,
      name,
      slug,
      vendor_id: user.id,
      ...(category_id ? { category_id } : {}),
    })
    .select('id, slug')
    .single() as { data: { id: string; slug: string } | null; error: { message: string } | null }

  if (error || !product) return { error: error?.message ?? 'Failed to create product' }

  revalidatePath('/vendor/products')
  return { success: true, data: { id: product.id, slug: product.slug } }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateProduct(
  productId: string,
  data: ProductInput
): Promise<ActionResult> {
  const parsed = productSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role, account_status')
    .eq('id', user.id)
    .single() as { data: { role: string; account_status: string } | null }

  if (!profile || profile.role !== 'vendor') return { error: 'Vendor account required' }
  if (profile.account_status !== 'active') {
    return { error: 'Your account must be approved before editing products.' }
  }

  const { category_id, ...rest } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('products')
    .update({ ...rest, category_id: category_id ?? null })
    .eq('id', productId)
    .eq('vendor_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/vendor/products')
  revalidatePath(`/vendor/products/${productId}/edit`)
  return { success: true }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteProduct(productId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'vendor') return { error: 'Vendor account required' }

  // Fetch image URLs before deletion for storage cleanup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: images } = await (supabase as any)
    .from('product_images')
    .select('url')
    .eq('product_id', productId) as { data: { url: string }[] | null }

  // Verify ownership via vendor_id; RLS enforces same rule
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('vendor_id', user.id)

  if (error) return { error: error.message }

  // Best-effort storage cleanup — orphaned files are non-fatal
  if (images?.length) {
    const marker = `/object/public/${STORAGE_BUCKETS.MARKETPLACE}/`
    for (const img of images) {
      try {
        const path = img.url.split(marker)[1]
        if (path) await supabase.storage.from(STORAGE_BUCKETS.MARKETPLACE).remove([path])
      } catch { /* non-fatal */ }
    }
  }

  revalidatePath('/vendor/products')
  return { success: true }
}

// ─── Toggle availability ─────────────────────────────────────────────────────

export async function toggleProductAvailability(
  productId: string,
  isAvailable: boolean
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'vendor') return { error: 'Vendor account required' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('products')
    .update({ is_available: isAvailable })
    .eq('id', productId)
    .eq('vendor_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/vendor/products')
  return { success: true }
}

// ─── Product images ───────────────────────────────────────────────────────────

export async function addProductImage(
  productId: string,
  url: string,
  isPrimary: boolean,
  sortOrder: number
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'vendor') return { error: 'Vendor account required' }

  // Verify product ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: product } = await (supabase as any)
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('vendor_id', user.id)
    .single() as { data: { id: string } | null }

  if (!product) return { error: 'Product not found or access denied' }

  // Enforce max 5 images
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId) as { count: number | null }

  if ((count ?? 0) >= 5) return { error: 'Maximum 5 images per product' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: image, error } = await (supabase as any)
    .from('product_images')
    .insert({ product_id: productId, url, is_primary: isPrimary, sort_order: sortOrder })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (error || !image) return { error: error?.message ?? 'Failed to add image' }

  revalidatePath(`/vendor/products/${productId}/edit`)
  return { success: true, data: { id: image.id } }
}

export async function removeProductImage(
  imageId: string,
  productId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'vendor') return { error: 'Vendor account required' }

  // Verify ownership and fetch URL for storage cleanup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: image } = await (supabase as any)
    .from('product_images')
    .select('url, products!inner(vendor_id)')
    .eq('id', imageId)
    .eq('product_id', productId)
    .eq('products.vendor_id', user.id)
    .single() as { data: { url: string } | null }

  if (!image) return { error: 'Image not found or access denied' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('product_images')
    .delete()
    .eq('id', imageId)
    .eq('product_id', productId)

  if (error) return { error: error.message }

  // Best-effort storage cleanup
  try {
    const marker = `/object/public/${STORAGE_BUCKETS.MARKETPLACE}/`
    const path = image.url.split(marker)[1]
    if (path) await supabase.storage.from(STORAGE_BUCKETS.MARKETPLACE).remove([path])
  } catch { /* non-fatal */ }

  revalidatePath(`/vendor/products/${productId}/edit`)
  return { success: true }
}
