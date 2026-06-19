import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { ProductForm } from '@/components/marketplace/ProductForm'

export const metadata: Metadata = { title: 'Edit Product — Vendor' }

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'vendor') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [{ data: product }, { data: categories }, { data: images }] = await Promise.all([
    sb.from('products')
      .select('id, name, description, sku, brand, category_id, price, original_price, stock_qty, min_order_qty, unit, is_active')
      .eq('id', id)
      .eq('vendor_id', profile.id)
      .single(),
    sb.from('product_categories').select('id, name').eq('is_active', true).order('sort_order'),
    sb.from('product_images').select('id, url, is_primary').eq('product_id', id).order('sort_order'),
  ])

  if (!product) notFound()

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Edit Product</h1>
        <p className="text-sm text-muted-foreground">{product.name}</p>
      </div>
      <ProductForm
        userId={profile.id}
        categories={categories ?? []}
        product={{ ...product, images: images ?? [] }}
      />
    </div>
  )
}
