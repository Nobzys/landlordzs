import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Service-role Supabase client — bypasses ALL RLS policies.
// MUST only be used in:
//   - Route Handlers under /api/
//   - Server Actions where admin-level writes are needed
// NEVER import this in client components or expose the key to the browser.
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — admin client unavailable')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession:   false,
      },
    }
  )
}
