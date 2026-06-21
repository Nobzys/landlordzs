'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProduct, updateProduct } from '@/lib/actions/marketplace'
import { productCreateSchema, type ProductCreateInput } from '@/lib/validations/marketplace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProductImageManager, type ProductImageItem } from '@/components/marketplace/ProductImageManager'

interface ProductCategory {
  id: string
  name: string
}

interface ProductFormProps {
  userId: string
  categories: ProductCategory[]
  product?: {
    id: string
    name: string
    description: string | null
    sku: string | null
    brand: string | null
    category_id: string | null
    price: number
    original_price: number | null
    stock_qty: number
    min_order_qty: number
    unit: string
    is_active: boolean
    images: ProductImageItem[]
  }
}

export function ProductForm({ userId, categories, product }: ProductFormProps) {
  const router = useRouter()
  const [err, setErr] = useState('')
  const [pending, startTransition] = useTransition()

  const form = useForm<ProductCreateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productCreateSchema) as any,
    defaultValues: {
      name:           product?.name ?? '',
      description:    product?.description ?? '',
      sku:            product?.sku ?? '',
      brand:          product?.brand ?? '',
      category_id:    product?.category_id ?? undefined,
      price:          product?.price ?? 0,
      original_price: product?.original_price ?? undefined,
      stock_qty:      product?.stock_qty ?? 0,
      min_order_qty:  product?.min_order_qty ?? 1,
      unit:           product?.unit ?? 'unit',
      is_active:      product?.is_active ?? true,
    },
  })

  const onSubmit = (data: ProductCreateInput) => {
    setErr('')
    startTransition(async () => {
      const res = product
        ? await updateProduct(product.id, data)
        : await createProduct(data)

      if (res?.error) {
        setErr(res.error)
        return
      }

      if (!product && res.data?.id) {
        router.push(`/vendor/products/${res.data.id}/edit`)
      } else {
        router.push('/vendor/products')
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Product Details</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl><Input {...field} disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={4}
                      disabled={pending}
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="brand" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl><Input {...field} disabled={pending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sku" render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl><Input {...field} disabled={pending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="category_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={field.value ?? ''}
                      disabled={pending}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    >
                      <option value="">Select a category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (XAF)</FormLabel>
                    <FormControl><Input type="number" min={1} {...field} disabled={pending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="original_price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original Price (XAF) <span className="text-muted-foreground text-xs">(for discounts, optional)</span></FormLabel>
                    <FormControl><Input type="number" min={1} {...field} value={field.value ?? ''} disabled={pending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="stock_qty" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Quantity</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} disabled={pending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="min_order_qty" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Order Qty</FormLabel>
                    <FormControl><Input type="number" min={1} {...field} disabled={pending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl><Input {...field} placeholder="bag, m³, piece…" disabled={pending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="is_active" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      disabled={pending}
                      className="rounded"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Active (visible in the marketplace)</FormLabel>
                </FormItem>
              )} />

              <div className="flex items-center gap-4 pt-1">
                <Button type="submit" disabled={pending}>
                  {pending ? 'Saving…' : product ? 'Save Changes' : 'Create Product'}
                </Button>
                {err && <p className="text-sm text-destructive">{err}</p>}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {product && (
        <Card>
          <CardHeader><CardTitle className="text-base">Product Images</CardTitle></CardHeader>
          <CardContent>
            <ProductImageManager userId={userId} productId={product.id} images={product.images} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
