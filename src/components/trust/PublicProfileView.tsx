import Link from 'next/link'
import { UserCircle, MapPin, Calendar, Star, Building2, Briefcase, Globe } from 'lucide-react'
import { VerifiedBadge } from '@/components/trust/VerifiedBadge'
import { ReportProfileButton } from '@/components/trust/ReportProfileButton'
import { ReviewList } from '@/components/reviews/ReviewList'
import { PropertyImagePlaceholder } from '@/components/properties/PropertyImagePlaceholder'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ROLE_LABELS } from '@/lib/utils/constants'
import { formatDate } from '@/lib/utils/format'
import type { PublicProfileData } from '@/lib/data/publicProfile'
import type { Review } from '@/types/review'

interface PublicProfileViewProps {
  data: PublicProfileData
  viewerId: string | null
}

export function PublicProfileView({ data, viewerId }: PublicProfileViewProps) {
  const name = data.display_name?.trim() || data.full_name?.trim() || 'LANDLORDZS user'
  const isOwnProfile = viewerId === data.id
  const ext = data.extension

  const companyName  = data.company_name ?? ext?.store_name ?? ext?.company_name ?? null
  const experience   = data.years_experience ?? (typeof ext?.experience_years === 'number' ? ext.experience_years : null)
  const specialties  = data.specialties.length > 0 ? data.specialties : (Array.isArray(ext?.specializations) ? ext.specializations : [])
  const serviceAreas = data.service_areas.length > 0 ? data.service_areas : (Array.isArray(ext?.service_areas) ? ext.service_areas : [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="rounded-2xl border overflow-hidden">
        {data.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.cover_url} alt="" className="h-32 w-full object-cover" />
        )}
        <div className="p-6 space-y-4">
        <div className="flex items-start gap-4 flex-wrap">
          {data.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.avatar_url} alt={name} className="h-20 w-20 rounded-full object-cover shrink-0 border" />
          ) : (
            <UserCircle className="h-20 w-20 text-muted-foreground shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{name}</h1>
              <VerifiedBadge verified={data.is_verified} />
              {data.kyc_level && data.kyc_level !== 'none' && (
                <Badge variant="secondary" className="text-xs capitalize">{data.kyc_level} verified</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <Badge variant="outline">{ROLE_LABELS[data.role] ?? data.role}</Badge>
              {companyName && <span className="text-sm text-muted-foreground">{companyName}</span>}
            </div>
            <div className="flex items-center gap-4 flex-wrap mt-2 text-xs text-muted-foreground">
              {data.city && (
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{data.city}</span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Member since {formatDate(data.created_at)}
              </span>
              {data.reviews.count > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {data.reviews.average.toFixed(1)} ({data.reviews.count} reviews)
                </span>
              )}
              {data.website_url && (
                <a href={data.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <Globe className="h-3.5 w-3.5" />Website
                </a>
              )}
            </div>
          </div>
        </div>

        {data.bio && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.bio}</p>}

       {/* Service areas (agent / professional roles) */}
{(serviceAreas?.length ?? 0) > 0 && (
  <div className="flex flex-wrap gap-2">
    {(serviceAreas ?? []).map((area: string) => (
      <Badge
        key={area}
        variant="secondary"
        className="text-xs capitalize"
      >
        {area}
      </Badge>
    ))}
  </div>
)}
        </div>
      </div>

      {/* Role-specific stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {data.properties && (
          <>
            <Stat icon={Building2} label="Active Listings" value={data.properties.active} />
            <Stat icon={Building2} label="Sold / Rented" value={data.properties.soldOrRented} />
          </>
        )}
        {typeof ext?.listing_count === 'number' && (
          <Stat icon={Building2} label="Active Listings" value={ext.listing_count} />
        )}
        {typeof ext?.sold_count === 'number' && (
          <Stat icon={Building2} label="Sold / Rented" value={ext.sold_count} />
        )}
        {typeof ext?.product_count === 'number' && (
          <Stat icon={Briefcase} label="Products" value={ext.product_count} />
        )}
        {typeof ext?.project_count === 'number' && (
          <Stat icon={Briefcase} label="Projects" value={ext.project_count} />
        )}
        {typeof experience === 'number' && experience > 0 && (
          <Stat icon={Calendar} label="Experience" value={`${experience} yrs`} />
        )}
      </div>

      {/* Specializations / certifications */}
     {(specialties?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Services Offered</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
             {(specialties ?? []).map((s: string) => (
                <Badge key={s} variant="secondary" className="text-xs capitalize">{s.replace(/_/g, ' ')}</Badge>
              ))}
            </div>
           {ext?.license_number && (
  <p className="text-xs text-muted-foreground mt-3">
    License #: {ext.license_number}
    {ext.license_verified && (
      <span className="text-emerald-600 font-medium">
        • Verified
      </span>
    )}
  </p>
)}
          </CardContent>
        </Card>
      )}

      {/* Portfolio */}
      {data.portfolio.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Portfolio</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.portfolio.map((item) => {
                const cover = item.images.find((img) => img.is_cover) ?? item.images[0]
                return (
                  <div key={item.id} className="rounded-lg border overflow-hidden">
                    <div className="relative h-40 w-full">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover.url} alt={item.title} className="h-40 w-full object-cover" />
                      ) : (
                        <PropertyImagePlaceholder />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Reviews</CardTitle></CardHeader>
        <CardContent>
          <ReviewList
            items={data.reviews.items.map((r) => ({
              review: r as unknown as Review,
              personName: r.reviewer?.display_name?.trim() || r.reviewer?.full_name?.trim() || 'Anonymous',
              personAvatarUrl: r.reviewer?.avatar_url,
            }))}
          />
        </CardContent>
      </Card>

      {!isOwnProfile && viewerId && (
        <div className="flex justify-end">
          <ReportProfileButton targetId={data.id} />
        </div>
      )}

      <div className="text-center">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">Back to LANDLORDZS</Link>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
