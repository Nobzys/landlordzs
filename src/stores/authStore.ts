import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@/types/auth'

interface AuthState {
  user:       User | null
  profile:    Profile | null
  isLoading:  boolean
  isHydrated: boolean
}

interface AuthActions {
  setUser:    (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  setHydrated: () => void
  // Derived helpers
  role:                 () => UserRole | null
  isAuthenticated:      () => boolean
  isOnboardingComplete: () => boolean
  reset:                () => void
}

const initialState: AuthState = {
  user:       null,
  profile:    null,
  isLoading:  true,
  isHydrated: false,
}

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({ user }),

      setProfile: (profile) => set({ profile }),

      setLoading: (isLoading) => set({ isLoading }),

      setHydrated: () => set({ isHydrated: true, isLoading: false }),

      role: () => get().profile?.role ?? null,

      isAuthenticated: () => !!get().user,

      isOnboardingComplete: () => get().profile?.onboarding_completed ?? false,

      reset: () => set({ ...initialState, isLoading: false, isHydrated: true }),
    }),
    { name: 'AuthStore' }
  )
)
