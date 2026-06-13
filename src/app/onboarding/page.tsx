import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/supabase/server'
import { ROLE_DASHBOARDS } from '@/lib/utils/constants'
import { OnboardingFlow } from '@/components/auth/OnboardingFlow'
import type { UserRole } from '@/types/auth'

export const metadata = {
  title: 'Setup Your Account — LANDLORDZS',
}

// This page is accessible immediately after email verification.
// Middleware ensures only authenticated users reach it.
export default async function OnboardingPage() {
  const profile = await getServerProfile()

  if (!profile) {
    redirect('/login')
  }

  // Already completed — skip to dashboard
  if (profile.onboarding_completed) {
    redirect(ROLE_DASHBOARDS[profile.role as UserRole] ?? '/account')
  }

  return (
    <main className="min-h-svh bg-muted/30 px-4 py-12">
      <OnboardingFlow profile={profile} />
    </main>
  )
}
