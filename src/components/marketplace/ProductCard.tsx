import Link from 'next/link'
import Image from 'next/image'
import { Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatXAF } from '@/lib/utils/format'

export type ProductCardData = {
  id:               string
  name:             string
  price:            number
  original_price:   number | null
  unit:             string
  stock_qty:        number
  brand:            string | null
  product_images:   { url: string; is_primary: boolean; sort_order: number }[]
  vendor_profiles:  { store_slug: string; store_name: string } | null
  product_categories: { name: string } | null
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const sorted = [...(product.product_images ?? [])].sort(
    (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order
  )
  const primaryImage  = sorted[0]
  const storeSlug     = product.vendor_profiles?.store_slug ?? 'store'
  const href          = `/materials/${storeSlug}/${product.id}`
  const isOutOfStock  = product.stock_qty === 0
  const hasDiscount   = product.original_price != null && product.original_price > product.price

  return (
    <Link
      href={href}
      className="group block rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Badge variant="secondary">Out of stock</Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-1">
        {product.product_categories?.name && (
          <p className="text-xs text-muted-foreground">{product.product_categories.name}</p>
        )}
        <p className="font-medium text-sm leading-snug line-clamp-2">{product.name}</p>
        {product.brand && (
          <p className="text-xs text-muted-foreground">{product.brand}</p>
        )}
        <div className="flex items-baseline gap-2 pt-1">
          <span className="font-semibold text-sm">{formatXAF(product.price)}</span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              {formatXAF(product.original_price!)}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">/{product.unit}</span>
        </div>
        {product.vendor_profiles?.store_name && (
          <p className="text-xs text-muted-foreground truncate">
            {product.vendor_profiles.store_name}
          </p>
        )}
      </div>
    </Link>
  )
}
