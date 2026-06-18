import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Supabase PKCE OAuth + email magic link callback handler.
// Supabase redirects here with ?code=... after email verification,
// OAuth sign-in, or password reset.
const DEBUG = process.env.NODE_ENV !== 'production'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  // Don't trust new URL(request.url).origin — under `next start` without an
  // explicit -H hostname, it resolves to localhost regardless of the Host
  // header the client actually sent (e.g. 127.0.0.1). A redirect Location
  // pointing at the wrong host strands the session cookies Set-Cookie just
  // attached to this same response, since they're host-only and scoped to
  // the host the browser actually requested. Same fix as signUp() in
  // src/lib/actions/auth.ts.
  const host  = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto')
    ?? (host?.startsWith('localhost') || /^127\.|^\[?::1]/.test(host ?? '') ? 'http' : 'https')
  const origin = host ? `${proto}://${host}` : new URL(request.url).origin

  const code     = searchParams.get('code')
  const next     = searchParams.get('next') ?? '/onboarding'
  const errorMsg = searchParams.get('error_description')

  // TEMPORARY: diagnosing reports of otp_expired on first click. Remove once
  // confirmed fixed. Logs only in non-production environments.
  if (DEBUG) {
    console.log('[auth/callback] incoming URL:', request.url)
    console.log('[auth/callback] query params:', Object.fromEntries(searchParams.entries()))
  }

  if (errorMsg) {
    console.error('[auth/callback] Supabase error:', errorMsg)
    const dest = `${origin}/verify-email?error=${encodeURIComponent(errorMsg)}`
    if (DEBUG) console.log('[auth/callback] redirecting to (Supabase-reported error):', dest)
    return NextResponse.redirect(dest)
  }

  if (!code) {
    const dest = `${origin}/login?error=missing_code`
    if (DEBUG) console.log('[auth/callback] no code param, redirecting to:', dest)
    return NextResponse.redirect(dest)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (DEBUG) {
    console.log('[auth/callback] exchangeCodeForSession result:', {
      ok:    !error,
      error: error?.message ?? null,
    })
  }

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message)

    // This route only ever sees PKCE-style ?code= links (password reset,
    // OAuth). The verifier paired with that code lives in a cookie set on
    // the device/browser that originated the request — opening the link
    // somewhere else (a different browser, a mail app's in-app browser, a
    // link-scanning proxy) always fails with this exact error. It's not an
    // expired/reused link, so don't tell the user that.
    const wrongBrowser = error.code === 'pkce_code_verifier_not_found'
    const reason = wrongBrowser ? 'same_browser_required' : 'link_expired'

    if (next === '/reset-password') {
      const dest = `${origin}/forgot-password?error=${reason}`
      if (DEBUG) console.log('[auth/callback] redirecting to:', dest)
      return NextResponse.redirect(dest)
    }
    const dest = `${origin}/verify-email?error=${wrongBrowser ? reason : encodeURIComponent(error.message)}`
    if (DEBUG) console.log('[auth/callback] redirecting to:', dest)
    return NextResponse.redirect(dest)
  }

  // Session is now set — send the user straight to their destination.
  // For email verification (next=/onboarding) this removes the extra
  // "Continue to Setup" click that the old /verify-email intermediate page required.
  const dest = `${origin}${next}`
  if (DEBUG) console.log('[auth/callback] success, redirecting to:', dest)
  return NextResponse.redirect(dest)
}
