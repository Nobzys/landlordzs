import { MapPin, Star, BadgeCheck } from 'lucide-react'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { formatXAF } from '@/lib/utils/format'

export interface ServiceListing {
  id:            string
  title:         string
  description:   string | null
  base_price:    number | null
  price_type:    string
  service_areas: string[]
  rating_avg:    number
  rating_count:  number
  booking_count: number
  is_featured:   boolean
  profiles: {
    id:          string
    full_name:   string
    avatar_url:  string | null
    city:        string | null
    is_verified: boolean
  } | null
}

const PRICE_TYPE_LABELS: Record<string, string> = {
  fixed:   '',
  hourly:  '/hr',
  daily:   '/day',
  project: '/project',
}

function StarRating({ avg, count }: { avg: number; count: number }) {
  const rounded = Math.round(avg * 2) / 2
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <Star
            key={n}
            className={`h-3.5 w-3.5 ${
              n <= rounded
                ? 'fill-amber-400 text-amber-400'
                : n - 0.5 === rounded
                  ? 'fill-amber-400/50 text-amber-400'
                  : 'fill-none text-muted-foreground/30'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {avg.toFixed(1)} ({count})
      </span>
    </div>
  )
}

interface ServiceListingCardProps {
  listing: ServiceListing
}

export function ServiceListingCard({ listing }: ServiceListingCardProps) {
  const provider = listing.profiles
  const initials = provider?.full_name
    ? provider.full_name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  const cityLabels = (listing.service_areas ?? [])
    .slice(0, 2)
    .map(v => CAMEROON_CITIES.find(c => c.value === v)?.label ?? v)

  const suffix = PRICE_TYPE_LABELS[listing.price_type] ?? ''
  const priceLabel = listing.base_price
    ? `From ${formatXAF(listing.base_price)}${suffix}`
    : 'Price on request'

  return (
    <div className={`rounded-xl border bg-card p-5 flex flex-col gap-4 h-full ${
      listing.is_featured ? 'border-[#B71C1C]/30 ring-1 ring-[#B71C1C]/20' : ''
    }`}>
      {listing.is_featured && (
        <span className="self-start text-[10px] font-bold uppercase tracking-wider text-[#B71C1C] bg-[#B71C1C]/10 px-2 py-0.5 rounded-full">
          Featured
        </span>
      )}

      {/* Provider row */}
      <div className="flex items-start gap-3">
        {provider?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={provider.avatar_url}
            alt={provider.full_name}
            className="h-10 w-10 rounded-full object-cover shrink-0 bg-muted"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-[#B71C1C]/10 text-[#B71C1C] flex items-center justify-center text-sm font-bold shrink-0">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-sm truncate">
              {provider?.full_name ?? 'Service Provider'}
            </span>
            {(provider?.is_verified) && (
              <BadgeCheck className="h-4 w-4 text-[#B71C1C] shrink-0" aria-label="Verified" />
            )}
          </div>
          {listing.rating_count > 0 ? (
            <StarRating avg={listing.rating_avg} count={listing.rating_count} />
          ) : (
            <span className="text-xs text-muted-foreground">No reviews yet</span>
          )}
        </div>
      </div>

      {/* Listing title + description */}
      <div className="space-y-1">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2">{listing.title}</h3>
        {listing.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 pt-3 border-t text-xs text-muted-foreground">
        {cityLabels.length > 0 && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {cityLabels.join(', ')}
            {listing.service_areas.length > 2 && ` +${listing.service_areas.length - 2}`}
          </span>
        )}
        <span className="font-semibold text-foreground ml-auto">{priceLabel}</span>
      </div>

      {listing.booking_count > 0 && (
        <p className="text-xs text-muted-foreground -mt-2">
          {listing.booking_count} booking{listing.booking_count !== 1 ? 's' : ''} completed
        </p>
      )}
    </div>
  )
}
