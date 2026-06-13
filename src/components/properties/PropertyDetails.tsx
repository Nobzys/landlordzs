import { Bed, Bath, Toilet, Maximize2, Calendar, MapPin, BadgeCheck, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PropertyPriceTag } from './PropertyPriceTag'
import { FavoriteButton } from './FavoriteButton'
import { ShareButton } from './ShareButton'
import { formatArea, formatDate } from '@/lib/utils/format'
import type { PropertyWithDetails } from '@/types/property'

const LAND_TITLE_LABELS: Record<string, string> = {
  titre_foncier:     'Titre Foncier',
  bail_emphyteotique:'Bail Emphytéotique',
  concession:        'Concession',
  none:              'None',
}

interface PropertyDetailsProps {
  property: PropertyWithDetails
}

export function PropertyDetails({ property }: PropertyDetailsProps) {
  const owner = property.owner
  const agent = property.agent

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold leading-tight">{property.title}</h1>
          <div className="flex gap-2 shrink-0">
            <FavoriteButton propertyId={property.id} />
            <ShareButton title={property.title} />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="text-sm capitalize">
            {[property.neighborhood, property.city].filter(Boolean).join(', ')}
          </span>
          {property.is_verified && (
            <Badge variant="secondary" className="ml-2 gap-1 text-blue-700 bg-blue-50">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified
            </Badge>
          )}
        </div>

        <div className="mt-4">
          <PropertyPriceTag
            price={property.price}
            listingType={property.listing_type}
            isNegotiable={property.is_negotiable}
            className="text-3xl"
          />
        </div>
      </div>

      <Separator />

      {/* Key stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {property.bedrooms > 0 && (
          <Stat icon={<Bed className="h-5 w-5" />} label="Bedrooms" value={property.bedrooms} />
        )}
        {property.bathrooms > 0 && (
          <Stat icon={<Bath className="h-5 w-5" />} label="Bathrooms" value={property.bathrooms} />
        )}
        {property.toilets > 0 && (
          <Stat icon={<Toilet className="h-5 w-5" />} label="Toilets" value={property.toilets} />
        )}
        {property.area_sqm && (
          <Stat icon={<Maximize2 className="h-5 w-5" />} label="Area" value={formatArea(property.area_sqm)} />
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <DetailRow label="Listing Type"  value={property.listing_type} className="capitalize" />
        <DetailRow label="Property Type" value={property.property_type.replace('_', ' ')} className="capitalize" />
        <DetailRow label="Land Title"    value={LAND_TITLE_LABELS[property.land_title] ?? property.land_title} />
        {property.land_area_sqm && <DetailRow label="Land Area" value={formatArea(property.land_area_sqm)} />}
        {property.year_built && <DetailRow label="Year Built" value={property.year_built.toString()} />}
        <DetailRow label="Furnished"   value={property.is_furnished ? 'Yes' : 'No'} />
        <DetailRow label="Listed"      value={formatDate(property.created_at)} />
      </div>

      {/* Features */}
      <div className="flex flex-wrap gap-2">
        {property.is_furnished  && <FeatureBadge label="Furnished" />}
        {property.has_security  && <FeatureBadge label="24h Security" />}
        {property.has_generator && <FeatureBadge label="Generator" />}
        {property.has_borehole  && <FeatureBadge label="Borehole" />}
      </div>

      <Separator />

      {/* Description */}
      {property.description && (
        <div>
          <h2 className="font-semibold mb-2">Description</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {property.description}
          </p>
        </div>
      )}

      {/* Contact */}
      <Separator />
      <div>
        <h2 className="font-semibold mb-3">Contact</h2>
        <ContactCard person={agent ?? owner} label={agent ? 'Agent' : 'Owner'} />
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-semibold text-sm">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function DetailRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className={className}>{value}</span>
    </>
  )
}

function FeatureBadge({ label }: { label: string }) {
  return (
    <Badge variant="secondary" className="gap-1">
      <Tag className="h-3 w-3" />
      {label}
    </Badge>
  )
}

function ContactCard({
  person,
  label,
}: {
  person: PropertyWithDetails['owner']
  label: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center font-semibold text-lg">
        {(person.display_name ?? person.full_name ?? '?').charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-sm truncate">
            {person.display_name ?? person.full_name ?? 'Unknown'}
          </p>
          {person.is_verified && <BadgeCheck className="h-4 w-4 text-blue-600 shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      {person.phone && (
        <a
          href={`tel:${person.phone}`}
          className="text-sm font-medium text-blue-700 hover:underline shrink-0"
        >
          Call
        </a>
      )}
    </div>
  )
}
