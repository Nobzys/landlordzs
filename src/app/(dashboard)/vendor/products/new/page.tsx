import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { ProductForm } from '@/components/marketplace/ProductForm'

export const metadata: Metadata = { title: 'Add Product — Vendor' }

export default async function NewProductPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'vendor') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: categories } = await (supabase as any)
    .from('product_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order') as { data: { id: string; name: string }[] | null }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Add Product</h1>
        <p className="text-sm text-muted-foreground">You can add photos after creating the product.</p>
      </div>
      <ProductForm userId={profile.id} categories={categories ?? []} />
    </div>
  )
}
