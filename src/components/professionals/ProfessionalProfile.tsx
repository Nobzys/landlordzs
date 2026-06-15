import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Globe, Building2, Calendar, Briefcase, Star } from 'lucide-react'
import { VerificationBadge } from '@/components/trust/VerificationBadge'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDate } from '@/lib/utils/format'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'

export interface ProfessionalProfileData {
  id:               string
  full_name:        string | null
  display_name:     string | null
  avatar_url:       string | null
  bio:              string | null
  role:             string
  city:             string | null
  is_premium:       boolean
  created_at:       string
  company_name:     string | null
  years_experience: number | null
  specialties:      string[]
  service_areas:    string[]
  website_url:      string | null
  badge_status:     string | null
}

interface ProfessionalProfileProps {
  profile: ProfessionalProfileData
}

export function ProfessionalProfile({ profile: p }: ProfessionalProfileProps) {
  const name      = p.display_name ?? p.full_name ?? 'Professional'
  const initial   = name.charAt(0).toUpperCase()
  const roleLabel = ROLE_LABELS[p.role as UserRole] ?? p.role

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/professionals" className="hover:text-foreground transition-colors">
          Professionals
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/professionals?role=${p.role}`}
          className="hover:text-foreground transition-colors"
        >
          {roleLabel}s
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground truncate max-w-[200px]">{name}</span>
      </nav>

      {/* Header card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="relative h-24 w-24 rounded-full bg-muted shrink-0 overflow-hidden flex items-center justify-center font-bold text-4xl">
            {p.avatar_url ? (
              <Image
                src={p.avatar_url}
                alt={name}
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : (
              <span>{initial}</span>
            )}
          </div>

          {/* Name + role + badges */}
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{name}</h1>
                {p.is_premium && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                    <Star className="h-3 w-3" />
                    Premium
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <Badge variant="secondary" className="capitalize">{roleLabel}</Badge>
                <VerificationBadge status={p.badge_status} />
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {p.city && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="capitalize">{p.city}</span>
                </div>
              )}
              {p.company_name && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>{p.company_name}</span>
                </div>
              )}
              {p.years_experience != null && (
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 shrink-0" />
                  <span>
                    {p.years_experience} yr{p.years_experience !== 1 ? 's' : ''} experience
                  </span>
                </div>
              )}
              {p.website_url && (
                <div className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4 shrink-0" />
                  <a
                    href={p.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 hover:underline truncate max-w-[200px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {p.website_url.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Member since {formatDate(p.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      {p.bio && (
        <section className="rounded-xl border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            About
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-line">{p.bio}</p>
        </section>
      )}

      {/* Specialties */}
      {p.specialties.length > 0 && (
        <section className="rounded-xl border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Specialties
          </h2>
          <div className="flex flex-wrap gap-2">
            {p.specialties.map((s) => (
              <span
                key={s}
                className="inline-flex items-center rounded-lg border px-3 py-1 text-sm"
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Service Areas */}
      {p.service_areas.length > 0 && (
        <section className="rounded-xl border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Service Areas
          </h2>
          <div className="flex flex-wrap gap-2">
            {p.service_areas.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-sm capitalize"
              >
                <MapPin className="h-3 w-3 text-muted-foreground" />
                {a}
              </span>
            ))}
          </div>
        </section>
      )}

      <Separator />

      {/* Portfolio placeholder */}
      <section className="rounded-xl border border-dashed p-10 text-center space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Portfolio coming soon</p>
        <p className="text-xs text-muted-foreground/70">
          Project photos and work samples will appear here
        </p>
      </section>

      {/* Reviews placeholder */}
      <section className="rounded-xl border border-dashed p-10 text-center space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Reviews coming soon</p>
        <p className="text-xs text-muted-foreground/70">
          Client testimonials will appear here
        </p>
      </section>
    </div>
  )
}
