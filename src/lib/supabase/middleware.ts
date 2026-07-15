import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

// Creates a Supabase client valid for use inside middleware.ts.
// Refreshes the session cookie on every request so it doesn't expire.
export async function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Propagate updated cookies back to both the request and response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Return a getter so callers always read the latest response value.
  // setAll() is called during supabase.auth.getUser() (token refresh), which
  // reassigns the local `response` variable. Returning the value directly would
  // capture the pre-refresh snapshot; the getter returns whatever is current.
  return { supabase, getResponse: () => response }
}
