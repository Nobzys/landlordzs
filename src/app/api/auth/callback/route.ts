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

  // Session is now set — send the user straight to their destination.
  // For email verification (next=/onboarding) this removes the extra
  // "Continue to Setup" click that the old /verify-email intermediate page required.
  return NextResponse.redirect(`${origin}${next}`)
}
