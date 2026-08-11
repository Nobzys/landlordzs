'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle, ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { ProductImageUpload, type ProductImage } from '@/components/vendor/ProductImageUpload'
import { createProduct, updateProduct, addProductImage } from '@/lib/actions/vendor'
import { uploadProductImage } from '@/lib/supabase/storage'
import { PRODUCT_UNITS, type ProductUnit, type ProductInput } from '@/lib/validations/product'

export type ProductCategory = {
  id: string
  name: string
  name_fr: string
}

interface ProductFormProps {
  mode: 'create' | 'edit'
  productId?: string
  userId: string
  categories: ProductCategory[]
  defaultValues?: {
    name?:           string
    name_fr?:        string
    description?:    string
    sku?:            string
    brand?:          string
    price?:          number
    original_price?: number
    stock_qty?:      number
    min_order_qty?:  number
    unit?:           ProductUnit
    category_id?:    string
    is_available?:   boolean
  }
  existingImages?: ProductImage[]
}

function StatusAlert({ type, message }: { type: 'success' | 'error'; message: string }) {
  const Icon = type === 'success' ? CheckCircle : AlertCircle
  return (
    <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
      type === 'success'
        ? 'bg-green-500/10 text-green-700 dark:text-green-400'
        : 'bg-destructive/10 text-destructive'
    }`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

type StagedFile = { localId: string; file: File; previewUrl: string }

const MAX_IMAGES = 5

export function ProductForm({
  mode,
  productId,
  userId,
  categories,
  defaultValues = {},
  existingImages = [],
}: ProductFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)

  const [unit, setUnit]             = useState<ProductUnit>(defaultValues.unit ?? 'unit')
  const [categoryId, setCategoryId] = useState(defaultValues.category_id ?? '')
  const [isAvailable, setIsAvailable] = useState(defaultValues.is_available ?? true)

  // Staged images — only used in create mode
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [imageError, setImageError]   = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canAddMore = stagedFiles.length < MAX_IMAGES

  function addStagedFiles(files: FileList | null) {
    if (!files) return
    setImageError(null)
    const remaining = MAX_IMAGES - stagedFiles.length
    const incoming  = Array.from(files).slice(0, remaining)
    const newStaged: StagedFile[] = incoming.map(file => ({
      localId:    crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setStagedFiles(prev => [...prev, ...newStaged])
  }

  function removeStagedFile(localId: string) {
    setStagedFiles(prev => {
      const target = prev.find(f => f.localId === localId)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter(f => f.localId !== localId)
    })
  }

  function buildProductInput(fd: FormData): ProductInput {
    const intVal = (key: string, def = 0): number => {
      const n = parseInt(fd.get(key) as string, 10)
      return isNaN(n) ? def : n
    }
    const strVal = (key: string): string | undefined => {
      const v = (fd.get(key) as string | null)?.trim()
      return v || undefined
    }

    return {
      name:           (fd.get('name') as string).trim(),
      name_fr:        strVal('name_fr'),
      description:    strVal('description'),
      sku:            strVal('sku'),
      brand:          strVal('brand'),
      price:          intVal('price', 0),
      original_price: strVal('original_price') ? intVal('original_price') : undefined,
      stock_qty:      intVal('stock_qty', 0),
      min_order_qty:  intVal('min_order_qty', 1),
      unit,
      category_id:    categoryId || undefined,
      is_available:   isAvailable,
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      setResult(null)
      setImageError(null)

      const input = buildProductInput(fd)

      if (mode === 'create') {
        const res = await createProduct(input)
        if (res.error) { setResult({ error: res.error }); return }

        const newProductId = res.data!.id

        // Upload staged images; failures are non-fatal (images can be added on the edit page)
        for (let i = 0; i < stagedFiles.length; i++) {
          try {
            const { url } = await uploadProductImage(newProductId, stagedFiles[i].file, userId)
            await addProductImage(newProductId, url, i === 0, i)
          } catch (err) {
            setImageError(
              `Product created, but image ${i + 1} failed: ${err instanceof Error ? err.message : 'Upload error'}. Add it on the edit page.`
            )
            break
          }
        }

        router.push('/vendor/products')
        return
      }

      // Edit mode
      const res = await updateProduct(productId!, input)
      setResult(res.error ? { error: res.error } : { success: true })
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Basic information */}
      <div className="rounded-xl border p-5 space-y-4">
        <p className="text-sm font-semibold">Basic Information</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="name">Product name <span className="text-destructive">*</span></Label>
            <Input
              id="name" name="name" required
              placeholder="e.g. Portland Cement 50kg"
              defaultValue={defaultValues.name}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name_fr">French name</Label>
            <Input
              id="name_fr" name="name_fr"
              placeholder="Nom en français (optionnel)"
              defaultValue={defaultValues.name_fr}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand">Brand / Manufacturer</Label>
            <Input
              id="brand" name="brand"
              placeholder="e.g. Cimencam"
              defaultValue={defaultValues.brand}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku" name="sku"
              placeholder="Optional stock-keeping unit"
              defaultValue={defaultValues.sku}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="No category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No category</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description" name="description" rows={3}
              placeholder="Describe the product, its uses, and specifications…"
              defaultValue={defaultValues.description}
            />
          </div>
        </div>
      </div>

      {/* Pricing & inventory */}
      <div className="rounded-xl border p-5 space-y-4">
        <p className="text-sm font-semibold">Pricing &amp; Inventory</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5 col-span-2 md:col-span-1">
            <Label htmlFor="price">Price (XAF) <span className="text-destructive">*</span></Label>
            <Input
              id="price" name="price" type="number" required min={0} step={1}
              placeholder="0"
              defaultValue={defaultValues.price}
            />
          </div>

          <div className="space-y-1.5 col-span-2 md:col-span-1">
            <Label htmlFor="original_price">Original price (XAF)</Label>
            <Input
              id="original_price" name="original_price" type="number" min={0} step={1}
              placeholder="Before discount"
              defaultValue={defaultValues.original_price}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Select value={unit} onValueChange={v => setUnit(v as ProductUnit)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_UNITS.map(u => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stock_qty">Stock quantity</Label>
            <Input
              id="stock_qty" name="stock_qty" type="number" min={0} step={1}
              defaultValue={defaultValues.stock_qty ?? 0}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="min_order_qty">Min order qty</Label>
            <Input
              id="min_order_qty" name="min_order_qty" type="number" min={1} step={1}
              defaultValue={defaultValues.min_order_qty ?? 1}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <input
            id="is_available"
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            checked={isAvailable}
            onChange={e => setIsAvailable(e.target.checked)}
          />
          <Label htmlFor="is_available" className="cursor-pointer font-normal">
            Available for purchase
          </Label>
        </div>
      </div>

      {/* Images */}
      {mode === 'edit' && productId ? (
        <div className="rounded-xl border p-5">
          <ProductImageUpload
            productId={productId}
            userId={userId}
            initialImages={existingImages}
          />
        </div>
      ) : (
        <div className="rounded-xl border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Product Images</p>
            <span className="text-xs text-muted-foreground">{stagedFiles.length} / {MAX_IMAGES}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {stagedFiles.map((sf, idx) => (
              <div key={sf.localId} className="group relative aspect-square rounded-lg border overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sf.previewUrl} alt={`Preview ${idx + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeStagedFile(sf.localId)}
                  className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}

            {canAddMore && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={e => addStagedFiles(e.target.files)}
          />

          {imageError && <StatusAlert type="error" message={imageError} />}

          <p className="text-xs text-muted-foreground">
            JPEG, PNG, or WebP · max 10 MB each · up to {MAX_IMAGES} images · first image becomes the primary
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex flex-col gap-3">
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === 'create' ? 'Create Product' : 'Save Changes'}
          </Button>
        </div>
        {result?.error   && <StatusAlert type="error"   message={result.error} />}
        {result?.success && <StatusAlert type="success" message="Product updated." />}
      </div>
    </form>
  )
}
