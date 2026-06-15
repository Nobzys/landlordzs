import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Building2, Star } from 'lucide-react'
import { VerificationBadge } from '@/components/trust/VerificationBadge'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'

export interface ProfessionalCardData {
  id:               string
  full_name:        string | null
  display_name:     string | null
  avatar_url:       string | null
  role:             string
  city:             string | null
  company_name:     string | null
  years_experience: number | null
  specialties:      string[]
  is_premium:       boolean
  slug:             string
  badge_status:     string | null
}

interface ProfessionalCardProps {
  professional: ProfessionalCardData
}

export function ProfessionalCard({ professional: p }: ProfessionalCardProps) {
  const name    = p.display_name ?? p.full_name ?? 'Professional'
  const initial = name.charAt(0).toUpperCase()
  const href    = `/professionals/${p.role}/${p.slug}`

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border bg-card p-5 gap-4 hover:shadow-md transition-shadow duration-200"
    >
      {/* Header: avatar + name + badge */}
      <div className="flex items-start gap-4">
        <div className="relative h-14 w-14 rounded-full bg-muted shrink-0 overflow-hidden flex items-center justify-center font-bold text-xl">
          {p.avatar_url ? (
            <Image
              src={p.avatar_url}
              alt={name}
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
              {name}
            </p>
            {p.is_premium && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                <Star className="h-2.5 w-2.5" />
                Premium
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {ROLE_LABELS[p.role as UserRole] ?? p.role}
          </p>
          <VerificationBadge status={p.badge_status} size="sm" />
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        {p.company_name && (
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{p.company_name}</span>
          </div>
        )}
        {p.city && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="capitalize">{p.city}</span>
          </div>
        )}
        {p.years_experience != null && (
          <p>
            {p.years_experience} year{p.years_experience !== 1 ? 's' : ''} experience
          </p>
        )}
        {p.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {p.specialties.slice(0, 3).map((s) => (
              <span key={s} className="bg-muted rounded px-1.5 py-0.5 text-[10px]">
                {s}
              </span>
            ))}
            {p.specialties.length > 3 && (
              <span className="bg-muted rounded px-1.5 py-0.5 text-[10px]">
                +{p.specialties.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
