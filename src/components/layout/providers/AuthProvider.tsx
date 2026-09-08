'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import type { Profile } from '@/types/auth'

// Mirrors getServerProfile()'s fallback in src/lib/supabase/server.ts.
// Used client-side when the profiles DB row doesn't exist yet (e.g. brand-new
// users, admin-created accounts). Never inserted into the database — UI only.
function buildFallbackProfile(user: User): Profile {
  const meta = (user.user_metadata ?? {}) as Record<string, string>
  const now  = new Date().toISOString()
  return {
    id:                   user.id,
    email:                user.email ?? '',
    full_name:            meta.full_name ?? null,
    display_name:         null,
    role:                 (meta.role ?? 'buyer') as Profile['role'],
    city:                 null,
    phone:                null,
    phone_verified:       false,
    avatar_url:           null,
    bio:                  null,
    is_verified:          false,
    is_premium:           false,
    account_status:       'active' as Profile['account_status'],
    onboarding_completed: false,
    expo_push_token:      null,
    created_at:           user.created_at ?? now,
    updated_at:           now,
  }
}

interface AuthProviderProps {
  children: ReactNode
  // Initial values fetched server-side to avoid flash on first render
  initialProfile?: Profile | null
}

export function AuthProvider({ children, initialProfile }: AuthProviderProps) {
  const router = useRouter()
  const { setUser, setProfile, setHydrated, reset } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()

    // Seed store with server-side values immediately (no loading flash)
    if (initialProfile) {
      setProfile(initialProfile)
    }

    // Get current session on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null)

      if (user && !initialProfile) {
        // Fetch profile if not pre-seeded; fall back to synthesis when no DB row exists
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            setProfile((data as Profile | null) ?? buildFallbackProfile(user))
            setHydrated()
          })
      } else {
        setHydrated()
      }
    })

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)

        if (event === 'SIGNED_OUT') {
          reset()
          router.refresh()
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            const eventUser = session.user
            supabase
              .from('profiles')
              .select('*')
              .eq('id', eventUser.id)
              .single()
              .then(({ data }) => {
                // Never call setProfile(null) for an authenticated user.
                // If the DB row is missing, synthesize from auth metadata so
                // TOKEN_REFRESHED cannot wipe a previously loaded profile.
                setProfile((data as Profile | null) ?? buildFallbackProfile(eventUser))
              })
          }
          router.refresh()
        }

        if (event === 'USER_UPDATED') {
          router.refresh()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}
