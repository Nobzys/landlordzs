import { formatXAF, formatXAFShort } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { DbListingType } from '@/types/database'

interface PropertyPriceTagProps {
  price: number
  listingType: DbListingType
  isNegotiable?: boolean
  className?: string
  short?: boolean
}

const LISTING_SUFFIX: Record<DbListingType, string> = {
  sale:     '',
  rent:     '/mo',
  shortlet: '/night',
}

export function PropertyPriceTag({
  price,
  listingType,
  isNegotiable,
  className,
  short = false,
}: PropertyPriceTagProps) {
  const formatted = short ? formatXAFShort(price) : formatXAF(price)
  const suffix    = LISTING_SUFFIX[listingType]

  return (
    <span className={cn('font-semibold text-blue-700 dark:text-blue-400', className)}>
      {formatted}
      {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
      {isNegotiable && (
        <span className="ml-1.5 text-xs font-normal text-emerald-600">Negotiable</span>
      )}
    </span>
  )
}
