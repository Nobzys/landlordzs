import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerProfile, createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { ProductForm, type ProductCategory } from '@/components/vendor/ProductForm'

export const metadata: Metadata = { title: 'Add Product — Vendor' }

export default async function NewProductPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'vendor') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: categories } = await (supabase as any)
    .from('product_categories')
    .select('id, name, name_fr')
    .eq('is_active', true)
    .order('sort_order') as { data: ProductCategory[] | null }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Add Product</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Fill in the details below. You can add images immediately or after the product is created.
      </p>
      <ProductForm
        mode="create"
        userId={profile.id}
        categories={categories ?? []}
      />
    </div>
  )
}
