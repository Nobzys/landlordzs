import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Bed, Bath, Maximize2, BadgeCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PropertyPriceTag } from './PropertyPriceTag'
import { FavoriteButton } from './FavoriteButton'
import { ShareButton } from './ShareButton'
import { cn } from '@/lib/utils/cn'
import { formatArea, formatRelative } from '@/lib/utils/format'
import type { PropertyWithImages } from '@/types/property'

interface PropertyCardProps {
  property: PropertyWithImages
  className?: string
}

const LISTING_TYPE_LABELS = { sale: 'For Sale', rent: 'For Rent', shortlet: 'Shortlet' } as const
const LISTING_TYPE_COLORS = {
  sale:     'bg-blue-600 text-white',
  rent:     'bg-emerald-600 text-white',
  shortlet: 'bg-amber-500 text-white',
} as const

export function PropertyCard({ property, className }: PropertyCardProps) {
  const primaryImage = property.property_images.find(i => i.is_primary) ?? property.property_images[0]
  const href = `/properties/${property.id}`

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl overflow-hidden border bg-card shadow-sm',
        'hover:shadow-md transition-shadow duration-200',
        className
      )}
    >
      {/* Full-card link overlay — behind action buttons (z-[1] < z-[2]) */}
      <Link href={href} className="absolute inset-0 z-[1]">
        <span className="sr-only">{property.title}</span>
      </Link>

      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt_text ?? property.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <span className="text-sm text-muted-foreground">No image</span>
          </div>
        )}

        {/* Listing type + featured badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge className={cn('text-xs font-medium', LISTING_TYPE_COLORS[property.listing_type])}>
            {LISTING_TYPE_LABELS[property.listing_type]}
          </Badge>
          {property.is_featured && (
            <Badge className="bg-amber-400 text-amber-900 text-xs font-medium">Featured</Badge>
          )}
        </div>
      </div>

      {/* Action buttons — siblings of the Link, not descendants; above the link overlay */}
      <div className="absolute top-3 right-3 flex gap-1.5 z-[2]">
        <FavoriteButton propertyId={property.id} size="sm" />
        <ShareButton title={property.title} />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">
            {property.title}
          </h3>
          {property.is_verified && (
            <BadgeCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="capitalize">
            {property.neighborhood
              ? `${property.neighborhood}, ${property.city}`
              : property.city}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-2 border-t">
          {property.bedrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bed className="h-3 w-3" />
              {property.bedrooms}
            </span>
          )}
          {property.bathrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bath className="h-3 w-3" />
              {property.bathrooms}
            </span>
          )}
          {property.area_sqm && (
            <span className="flex items-center gap-1">
              <Maximize2 className="h-3 w-3" />
              {formatArea(property.area_sqm)}
            </span>
          )}
          <span className="ml-auto">{formatRelative(property.created_at)}</span>
        </div>

        <PropertyPriceTag
          price={property.price}
          listingType={property.listing_type}
          isNegotiable={property.is_negotiable}
          className="text-base"
          short
        />
      </div>
    </div>
  )
}
