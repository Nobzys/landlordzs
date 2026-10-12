'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import type { Profile } from '@/types/auth'

const INACTIVITY_WARN_MS    = 25 * 60 * 1000
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000
const CHECK_INTERVAL_MS     = 30 * 1000

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const

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
  const { setUser, setProfile, setHydrated, reset, user } = useAuthStore()
  const [showInactivityWarning, setShowInactivityWarning] = useState(false)
  const lastActivityRef = useRef(Date.now())

  // ── Inactivity timeout ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setShowInactivityWarning(false)
      return
    }

    const supabase = createClient()

    function recordActivity() {
      lastActivityRef.current = Date.now()
      setShowInactivityWarning(false)
    }

    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, recordActivity, { passive: true }))

    const timer = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current
      if (idle >= INACTIVITY_TIMEOUT_MS) {
        supabase.auth.signOut()
      } else if (idle >= INACTIVITY_WARN_MS) {
        setShowInactivityWarning(true)
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, recordActivity))
      clearInterval(timer)
    }
  }, [user])

  function handleStaySignedIn() {
    lastActivityRef.current = Date.now()
    setShowInactivityWarning(false)
  }

  async function handleSignOutNow() {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  // ── Auth subscription ─────────────────────────────────────────────────────
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

  return (
    <>
      {children}
      {showInactivityWarning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inactivity-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl">
            <h2 id="inactivity-title" className="mb-2 text-lg font-semibold">
              Session expiring soon
            </h2>
            <p className="text-sm text-muted-foreground">
              You&apos;ve been inactive for 25 minutes. Click to stay signed in.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleSignOutNow}
                className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
              >
                Sign out
              </button>
              <button
                onClick={handleStaySignedIn}
                autoFocus
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Stay signed in
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
