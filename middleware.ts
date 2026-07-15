import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'
import { ROLE_DASHBOARDS, PUBLIC_ROUTES, AUTH_ROUTES, ROLE_PROTECTED_PREFIXES } from '@/lib/utils/constants'
import type { UserRole } from '@/types/auth'

// Copies any Set-Cookie headers from `refreshed` (the post-getUser response)
// onto a redirect response so rotated tokens are never silently discarded.
function redirectWithCookies(url: URL | string, refreshed: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url)
  refreshed.cookies.getAll().forEach(({ name, value, ...opts }) =>
    redirect.cookies.set(name, value, opts as Parameters<typeof redirect.cookies.set>[2])
  )
  return redirect
}

export async function middleware(request: NextRequest) {
  const { supabase, getResponse } = await createMiddlewareClient(request)

  // Always refresh session so it doesn't expire.
  // getResponse() is called AFTER this so we always get the version that
  // setAll() may have updated with fresh session cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Bind response here so every branch below gets the post-refresh version.
  // If setAll() ran during getUser() (token rotation), this is response_v2
  // with the new cookies; otherwise it is response_v1 unchanged.
  let response = getResponse()

  const { pathname } = request.nextUrl

  // ── Static assets + API passthrough ──────────────────────────────────────
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/callback') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$/)
  ) {
    return response
  }

  // ── Public marketing routes — always accessible ───────────────────────────
  const isPublic =
    pathname === '/' ||
    PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))

  if (isPublic) return response

  // ── Auth routes — redirect authenticated users away ───────────────────────
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))
  if (isAuthRoute) {
    // /reset-password is reached via a password-recovery session established
    // by the callback exchange — that session IS the "authenticated" state
    // this block would otherwise bounce away. Let it render regardless.
    if (user && !pathname.startsWith('/reset-password')) {
      // Fetch minimal profile to know where to send them
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('role, onboarding_completed')
        .eq('id', user.id)
        .single() as { data: { role: string; onboarding_completed: boolean } | null }

      const dest = !profile?.onboarding_completed
        ? '/onboarding'
        : (ROLE_DASHBOARDS[(profile?.role ?? 'buyer') as UserRole] ?? '/account')

      return redirectWithCookies(new URL(dest, request.url), response)
    }
    return response
  }

  // ── From here: all routes require authentication ──────────────────────────
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Fetch profile for role + status checks
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role, onboarding_completed, account_status')
    .eq('id', user.id)
    .single() as { data: { role: string; onboarding_completed: boolean; account_status: string } | null }

  if (!profile) {
    // No profile row yet (new user or table not yet seeded).
    // Don't sign out — send them to onboarding to create it.
    if (!pathname.startsWith('/onboarding')) {
      return redirectWithCookies(new URL('/onboarding', request.url), response)
    }
    return response
  }

  // ── Account suspended / banned / deactivated ─────────────────────────────
  if (['suspended', 'banned', 'deactivated'].includes(profile.account_status)) {
    await supabase.auth.signOut()
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'account_suspended')
    return NextResponse.redirect(loginUrl)
  }

  // ── Onboarding gate ───────────────────────────────────────────────────────
  // Allow /onboarding and /account/profile through even if not complete.
  const onboardingBypass =
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/api/')

  if (!profile.onboarding_completed && !onboardingBypass) {
    return redirectWithCookies(new URL('/onboarding', request.url), response)
  }

  // ── Role-based dashboard protection ──────────────────────────────────────
  const matchedPrefix = Object.keys(ROLE_PROTECTED_PREFIXES).find((prefix) =>
    pathname.startsWith(prefix)
  )

  if (matchedPrefix) {
    const allowedRoles = ROLE_PROTECTED_PREFIXES[matchedPrefix] as UserRole[]
    const userRole = profile.role as UserRole

    // Admin can access all dashboards
    if (userRole === 'admin') return response

    // User's role is allowed for this prefix
    if (allowedRoles.includes(userRole)) return response

    // Wrong role — redirect to their own dashboard
    const ownDashboard = ROLE_DASHBOARDS[userRole] ?? '/account'
    return redirectWithCookies(new URL(ownDashboard, request.url), response)
  }

  return response
}

export const config = {
  matcher: [
    // Match everything except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
