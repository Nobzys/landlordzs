import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Supabase PKCE OAuth + email magic link callback handler.
// Supabase redirects here with ?code=... after email verification,
// OAuth sign-in, or password reset.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  const code     = searchParams.get('code')
  const next     = searchParams.get('next') ?? '/onboarding'
  const errorMsg = searchParams.get('error_description')

  if (errorMsg) {
    console.error('[auth/callback] Supabase error:', errorMsg)
    return NextResponse.redirect(
      `${origin}/verify-email?error=${encodeURIComponent(errorMsg)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
    return NextResponse.redirect(
      `${origin}/verify-email?error=${encodeURIComponent(error.message)}`
    )
  }

  // Check if this is an email verification (next=/onboarding)
  // vs a password reset (next=/reset-password)
  if (next === '/onboarding') {
    // Mark as email-verified in the params so the verify-email page shows success
    const url = new URL(`${origin}/verify-email`)
    url.searchParams.set('verified', 'true')
    return NextResponse.redirect(url.toString())
  }

  return NextResponse.redirect(`${origin}${next}`)
}
