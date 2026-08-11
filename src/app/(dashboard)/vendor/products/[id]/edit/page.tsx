import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { ProductForm, type ProductCategory } from '@/components/vendor/ProductForm'
import type { ProductImage } from '@/components/vendor/ProductImageUpload'
import type { ProductUnit } from '@/lib/validations/product'

export const metadata: Metadata = { title: 'Edit Product — Vendor' }

interface EditProductPageProps {
  params: Promise<{ id: string }>
}

type ProductRow = {
  id:             string
  name:           string
  name_fr:        string | null
  description:    string | null
  sku:            string | null
  brand:          string | null
  price:          number
  original_price: number | null
  stock_qty:      number
  min_order_qty:  number
  unit:           string
  category_id:    string | null
  is_available:   boolean
  product_images: { id: string; url: string; is_primary: boolean; sort_order: number }[]
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params

  const profile = await getServerProfile()
  if (!profile || profile.role !== 'vendor') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  const [productRes, categoriesRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('products')
      .select(`
        id, name, name_fr, description, sku, brand,
        price, original_price, stock_qty, min_order_qty,
        unit, category_id, is_available,
        product_images(id, url, is_primary, sort_order)
      `)
      .eq('id', id)
      .eq('vendor_id', profile.id)
      .single() as Promise<{ data: ProductRow | null }>,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('product_categories')
      .select('id, name, name_fr')
      .eq('is_active', true)
      .order('sort_order') as Promise<{ data: ProductCategory[] | null }>,
  ])

  const product    = productRes.data
  const categories = categoriesRes.data ?? []

  if (!product) notFound()

  const existingImages: ProductImage[] = [...(product.product_images ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">Edit product details and manage images.</p>
      </div>

      <ProductForm
        mode="edit"
        productId={product.id}
        userId={profile.id}
        categories={categories}
        existingImages={existingImages}
        defaultValues={{
          name:           product.name,
          name_fr:        product.name_fr ?? undefined,
          description:    product.description ?? undefined,
          sku:            product.sku ?? undefined,
          brand:          product.brand ?? undefined,
          price:          product.price,
          original_price: product.original_price ?? undefined,
          stock_qty:      product.stock_qty,
          min_order_qty:  product.min_order_qty,
          unit:           product.unit as ProductUnit,
          category_id:    product.category_id ?? undefined,
          is_available:   product.is_available,
        }}
      />
    </div>
  )
}
