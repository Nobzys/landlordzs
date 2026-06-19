import Link from 'next/link'
import {
  Briefcase, Wrench, Ruler, Scale, CheckCircle2,
  XCircle, Calendar, DollarSign, Star, Wallet,
  ShieldCheck, Eye, MessageSquareText, FolderKanban, Plus,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricsGrid } from '@/components/dashboard/MetricsGrid'
import { formatXAF } from '@/lib/utils/format'
import { toggleProfessionalAvailability } from '@/lib/actions/profile'
import { VerificationBanner, type KycRecord } from '@/components/dashboard/VerificationBanner'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/auth'

export type { KycRecord } from '@/components/dashboard/VerificationBanner'

type ProfRole = 'contractor' | 'engineer' | 'architect' | 'lawyer'

interface ProfessionalProfile {
  profession_type: string
  company_name:    string | null
  specializations: string[]
  experience_years: number
  day_rate:        number | null
  is_available:    boolean
  is_verified:     boolean
}

interface WalletData {
  balance:  number
  currency: string
}

interface Props {
  profile: Profile
  prof:    ProfessionalProfile | null
  wallet:  WalletData | null
  kyc:     KycRecord | null
}

const ROLE_ICON: Record<ProfRole, React.ComponentType<{ className?: string }>> = {
  contractor: Briefcase,
  engineer:   Wrench,
  architect:  Ruler,
  lawyer:     Scale,
}

const ROLE_COLOR: Record<ProfRole, string> = {
  contractor: 'bg-orange-100 text-orange-700',
  engineer:   'bg-blue-100 text-blue-700',
  architect:  'bg-purple-100 text-purple-700',
  lawyer:     'bg-green-100 text-green-700',
}

export async function ProfessionalDashboard({ profile, prof, wallet, kyc }: Props) {
  const role         = profile.role as ProfRole
  const Icon         = ROLE_ICON[role] ?? Briefcase
  const colorClass   = ROLE_COLOR[role] ?? 'bg-gray-100 text-gray-700'
  const displayName  = profile.display_name ?? profile.full_name ?? 'there'
  const accountStatus = (profile as any).account_status as string ?? 'active'

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [reviewsRes, portfolioRes] = await Promise.all([
    sb.from('reviews').select('id', { count: 'exact', head: true }).eq('target_type', role).eq('target_id', profile.id).eq('is_hidden', false),
    sb.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('professional_id', profile.id),
  ])

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorClass}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {displayName}</h1>
            <p className="text-sm text-muted-foreground capitalize">{role} Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {accountStatus === 'active' && (
            <form action={toggleProfessionalAvailability}>
              <Button type="submit" variant="outline" size="sm" className="gap-2">
                {prof?.is_available ? (
                  <><CheckCircle2 className="h-4 w-4 text-green-500" />Available</>
                ) : (
                  <><XCircle className="h-4 w-4 text-muted-foreground" />Unavailable</>
                )}
              </Button>
            </form>
          )}
          <LinkButton href="/account/portfolio" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Portfolio Item
          </LinkButton>
        </div>
      </div>

      {/* Verification status banner */}
      <VerificationBanner accountStatus={accountStatus} kyc={kyc} />

      {/* Trust metrics — ordered by what matters most to a professional first:
          verification gates whether clients will hire you, reviews are social
          proof, then visibility/output metrics */}
      <MetricsGrid
        metrics={[
          { icon: ShieldCheck, label: 'Verification', value: prof?.is_verified ? 'Verified' : 'Pending' },
          { icon: MessageSquareText, label: 'Reviews', value: reviewsRes.count ?? 0 },
          { icon: Eye, label: 'Profile Views', value: profile.profile_view_count ?? 0 },
          { icon: FolderKanban, label: 'Portfolio Items', value: portfolioRes.count ?? 0 },
        ]}
      />

      {/* Operational stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2.5 text-muted-foreground mb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Calendar className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium">Experience</span>
          </div>
          <p className="text-3xl font-bold leading-tight tracking-tight">{prof?.experience_years ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">years</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2.5 text-muted-foreground mb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <DollarSign className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium">Day Rate</span>
          </div>
          <p className="text-3xl font-bold leading-tight tracking-tight">
            {prof?.day_rate ? formatXAF(prof.day_rate) : '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">per day</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2.5 text-muted-foreground mb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Star className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium">Specializations</span>
          </div>
          <p className="text-3xl font-bold leading-tight tracking-tight">{prof?.specializations?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">areas</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2.5 text-muted-foreground mb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Wallet className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium">Wallet</span>
          </div>
          <p className="text-3xl font-bold leading-tight tracking-tight">
            {wallet ? formatXAF(wallet.balance) : '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">balance</p>
        </div>
      </div>

      {/* Profile card */}
      {prof ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Professional Profile
              {prof.is_verified && (
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prof.company_name && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Company</p>
                <p className="font-medium">{prof.company_name}</p>
              </div>
            )}
            {profile.bio && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">About</p>
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              </div>
            )}
            {prof.specializations?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Specializations</p>
                <div className="flex flex-wrap gap-2">
                  {prof.specializations.map((s) => (
                    <Badge key={s} variant="secondary" className="capitalize text-xs">
                      {s.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {accountStatus === 'active' && (
              <div className="flex items-center gap-2 pt-1">
                {prof.is_available ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Available for work
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="h-3 w-3 mr-1" /> Currently unavailable
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Icon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium mb-1">Profile incomplete</p>
            <p className="text-sm text-muted-foreground mb-4">
              Complete your professional profile so clients can find you.
            </p>
            <Button asChild size="sm">
              <Link href="/account/profile">Complete Profile</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="rounded-xl border p-4">
        <h2 className="text-sm font-semibold mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/account/profile">Edit Profile</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/account/wallet">View Wallet</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/properties">Browse Properties</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
