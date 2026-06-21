import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShieldAlert, Briefcase } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/auth/ProfileForm'
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { KycVerificationSection } from '@/components/auth/KycVerificationSection'
import { AvatarUpload } from '@/components/trust/AvatarUpload'
import { VerifiedBadge } from '@/components/trust/VerifiedBadge'
import { ProfileVisibilityToggle } from '@/components/trust/ProfileVisibilityToggle'
import { ProfileCompletenessCard } from '@/components/trust/ProfileCompletenessCard'
import { CoverImageUpload } from '@/components/profile/CoverImageUpload'
import { ContactVisibilityToggle } from '@/components/profile/ContactVisibilityToggle'
import { PublicProfileFieldsForm } from '@/components/profile/PublicProfileFieldsForm'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS, APPROVAL_REQUIRED_ROLES } from '@/lib/utils/constants'
import { getCapabilities, getPublicProfilePath } from '@/lib/config/roleCapabilities'
import { getProfileCompleteness } from '@/lib/utils/profileCompleteness'
import type { KycRecord } from '@/components/dashboard/VerificationBanner'

export const metadata: Metadata = { title: 'My Profile' }

export default async function ProfilePage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const needsVerification = (APPROVAL_REQUIRED_ROLES as readonly string[]).includes(profile.role)
  const capabilities = getCapabilities(profile.role)

  const [agentRes, vendorRes, profRes, kycRes, portfolioCountRes] = await Promise.all([
    profile.role === 'agent'
      ? sb.from('agent_profiles')
          .select('experience_years, specializations, commission_rate')
          .eq('id', profile.id)
          .single()
      : Promise.resolve({ data: null }),

    profile.role === 'vendor'
      ? sb.from('vendor_profiles')
          .select('store_name, store_description')
          .eq('id', profile.id)
          .single()
      : Promise.resolve({ data: null }),

    capabilities.profileTable === 'professional_profiles'
      ? sb.from('professional_profiles')
          .select('company_name, specializations, experience_years, day_rate')
          .eq('id', profile.id)
          .single()
      : Promise.resolve({ data: null }),

    needsVerification
      ? (sb
          .from('kyc_records')
          .select('status, review_notes, national_id_front, national_id_back, business_reg, submitted_at')
          .eq('user_id', profile.id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle() as Promise<{ data: KycRecord | null }>)
      : Promise.resolve({ data: null }),

    capabilities.hasPortfolio
      ? sb.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('professional_id', profile.id)
      : Promise.resolve({ count: 0 }),
  ])

  const kyc = kycRes.data as KycRecord | null
  const publicProfilePath = getPublicProfilePath(profile.role, profile.id)
  const completeness = getProfileCompleteness({
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    city: profile.city,
    isVerified: profile.is_verified,
    capabilities,
    hasPortfolioItems: (portfolioCountRes.count ?? 0) > 0,
  })

  const showPendingBanner =
    needsVerification && profile.account_status === 'pending_verification'

  return (
    <div className="w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Pending verification banner */}
      {showPendingBanner && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Your account is awaiting verification.
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Upload your documents to complete the review process.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white">
            <a href="#identity-verification">Upload Documents</a>
          </Button>
        </div>
      )}

      {/* Cover image (public profile only) */}
      {capabilities.hasPublicProfile && (
        <CoverImageUpload userId={profile.id} currentUrl={profile.cover_url} />
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <AvatarUpload userId={profile.id} currentUrl={profile.avatar_url} name={profile.display_name ?? profile.full_name} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">My Profile</h1>
            <VerifiedBadge verified={profile.is_verified} />
          </div>
          <p className="text-sm text-muted-foreground">
            {ROLE_LABELS[profile.role]} · {profile.email}
          </p>
          {capabilities.hasPublicProfile && profile.slug && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Public profile: <code className="text-foreground">/u/{profile.slug}</code>
            </p>
          )}
        </div>
      </div>

      <ProfileCompletenessCard result={completeness} />

      {capabilities.hasPublicProfile && (
        <>
          <ProfileVisibilityToggle initialIsPublic={profile.is_public} publicProfilePath={publicProfilePath} />
          <ContactVisibilityToggle
            initialEmailVisibility={profile.email_visibility}
            initialPhoneVisibility={profile.phone_visibility}
          />
          <PublicProfileFieldsForm
            companyName={profile.company_name}
            yearsExperience={profile.years_experience}
            specialties={profile.specialties}
            serviceAreas={profile.service_areas}
            websiteUrl={profile.website_url}
          />
        </>
      )}

      {capabilities.hasPortfolio && (
        <Link
          href="/account/portfolio"
          className="flex items-center gap-3 rounded-xl border p-4 hover:bg-accent transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Briefcase className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Manage portfolio</p>
            <p className="text-xs text-muted-foreground">Showcase your past projects on your public profile.</p>
          </div>
        </Link>
      )}

      <ProfileForm
        profile={profile}
        agentProfile={agentRes.data ?? null}
        vendorProfile={vendorRes.data ?? null}
        professionalProfile={profRes.data ?? null}
      />

      {/* Identity verification — only for roles that require approval */}
      {needsVerification && (
        <KycVerificationSection profile={profile} kyc={kyc} />
      )}

      <ChangePasswordForm />
    </div>
  )
}
