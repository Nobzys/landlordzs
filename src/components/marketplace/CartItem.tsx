'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, Package } from 'lucide-react'
import { useTransition } from 'react'
import { updateCartQuantity, removeFromCart } from '@/lib/actions/orders'
import { formatXAF } from '@/lib/utils/format'

export type CartItemData = {
  id:       string
  quantity: number
  products: {
    id:             string
    name:           string
    price:          number
    unit:           string
    stock_qty:      number
    product_images: { url: string; is_primary: boolean; sort_order: number }[]
    vendor_profiles: { store_name: string; store_slug: string } | null
  } | null
}

export function CartItem({ item }: { item: CartItemData }) {
  const [isPending, startTransition] = useTransition()
  const product = item.products

  const primaryImage = product?.product_images?.length
    ? [...product.product_images].sort(
        (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order
      )[0]
    : null

  const storeSlug = product?.vendor_profiles?.store_slug ?? 'store'
  const lineTotal = (product?.price ?? 0) * item.quantity

  function handleUpdate(qty: number) {
    const fd = new FormData()
    fd.set('cartItemId', item.id)
    fd.set('quantity', String(qty))
    startTransition(() => { updateCartQuantity(fd) })
  }

  function handleRemove() {
    const fd = new FormData()
    fd.set('cartItemId', item.id)
    startTransition(() => { removeFromCart(fd) })
  }

  if (!product) return null

  return (
    <div
      className={`flex gap-3 py-4 transition-opacity ${isPending ? 'opacity-40 pointer-events-none' : ''}`}
    >
      {/* Thumbnail */}
      <Link
        href={`/materials/${storeSlug}/${product.id}`}
        className="relative h-20 w-20 shrink-0 rounded-lg border bg-muted overflow-hidden"
      >
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={product.name}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground/30" />
          </div>
        )}
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0 space-y-1">
        <Link
          href={`/materials/${storeSlug}/${product.id}`}
          className="text-sm font-medium line-clamp-2 hover:underline"
        >
          {product.name}
        </Link>
        {product.vendor_profiles?.store_name && (
          <p className="text-xs text-muted-foreground">{product.vendor_profiles.store_name}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {formatXAF(product.price)} / {product.unit}
        </p>

        {/* Quantity controls */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex items-center border rounded-md">
            <button
              type="button"
              onClick={() => handleUpdate(Math.max(1, item.quantity - 1))}
              disabled={item.quantity <= 1 || isPending}
              className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 text-sm font-medium min-w-[2rem] text-center select-none">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => handleUpdate(item.quantity + 1)}
              disabled={isPending || (product.stock_qty > 0 && item.quantity >= product.stock_qty)}
              className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Remove from cart"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Line total */}
      <div className="shrink-0 text-right self-start pt-1">
        <p className="text-sm font-semibold">{formatXAF(lineTotal)}</p>
      </div>
    </div>
  )
}
