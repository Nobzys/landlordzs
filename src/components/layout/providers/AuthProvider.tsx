'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import type { Profile } from '@/types/auth'

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
        // Fetch profile if not pre-seeded
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            setProfile(data as Profile | null)
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
            supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
              .then(({ data }) => {
                setProfile(data as Profile | null)
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
