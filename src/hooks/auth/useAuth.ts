'use client'

import { useAuthStore } from '@/stores/authStore'
import { ROLE_DASHBOARDS } from '@/types/auth'
import type { UserRole } from '@/types/auth'
import { canAccessAdmin } from '@/lib/roles'

// Primary auth hook — exposes the most commonly needed auth state.
export function useAuth() {
  const user            = useAuthStore((s) => s.user)
  const profile         = useAuthStore((s) => s.profile)
  const isLoading       = useAuthStore((s) => s.isLoading)
  const isHydrated      = useAuthStore((s) => s.isHydrated)
  const role            = useAuthStore((s) => s.role)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isOnboardingComplete = useAuthStore((s) => s.isOnboardingComplete)

  return {
    user,
    profile,
    isLoading,
    isHydrated,

    // Computed helpers
    role:                 role(),
    isAuthenticated:      isAuthenticated(),
    isOnboardingComplete: isOnboardingComplete(),
    isAdmin:              canAccessAdmin(profile?.role ?? ''),
    isVerified:           profile?.is_verified ?? false,
    dashboardPath:        profile?.role
                            ? (ROLE_DASHBOARDS[profile.role as UserRole] ?? '/account')
                            : null,
  }
}
