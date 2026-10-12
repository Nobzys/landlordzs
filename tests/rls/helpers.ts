/**
 * RLS integration test helpers.
 *
 * Tests in this directory require a running local Supabase instance:
 *   supabase start
 *
 * Set the following environment variables (or use the CLI defaults):
 *   SUPABASE_TEST_URL        – defaults to http://127.0.0.1:54321
 *   SUPABASE_TEST_ANON_KEY   – local anon JWT (found in `supabase status`)
 *   SUPABASE_TEST_SERVICE_KEY – local service-role JWT (found in `supabase status`)
 *
 * If SUPABASE_TEST_URL is not set, every describe block in this suite skips.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const TEST_URL         = process.env.SUPABASE_TEST_URL
export const TEST_ANON_KEY    = process.env.SUPABASE_TEST_ANON_KEY    ?? ''
export const TEST_SERVICE_KEY = process.env.SUPABASE_TEST_SERVICE_KEY ?? ''

/** True when the local Supabase instance is available. */
export const hasTestDb = Boolean(TEST_URL && TEST_ANON_KEY && TEST_SERVICE_KEY)

/** Admin client that bypasses RLS entirely. */
export function adminClient(): SupabaseClient {
  if (!TEST_URL) throw new Error('SUPABASE_TEST_URL not set')
  return createClient(TEST_URL, TEST_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Anon client signed in as the given user (via access_token). */
export function userClient(accessToken: string): SupabaseClient {
  if (!TEST_URL) throw new Error('SUPABASE_TEST_URL not set')
  const client = createClient(TEST_URL, TEST_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  return client
}

type CreatedUser = {
  id: string
  email: string
  password: string
  accessToken: string
  client: SupabaseClient
}

let _seq = 0

/**
 * Creates a test user with the given role via the admin API, signs in,
 * and returns the user id, credentials, and a signed-in Supabase client.
 */
export async function createTestUser(role: string): Promise<CreatedUser> {
  const admin  = adminClient()
  const email  = `rls-test-${role}-${++_seq}-${Date.now()}@example.test`
  const password = 'Test!Pass1234'

  // Create auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authErr || !authData.user) throw new Error(`createUser failed: ${authErr?.message}`)

  const userId = authData.user.id

  // Set role in profiles
  const { error: profileErr } = await (admin as any)
    .from('profiles')
    .update({ role, account_status: 'active' })
    .eq('id', userId)
  if (profileErr) throw new Error(`profile update failed: ${profileErr.message}`)

  // Sign in to get access token
  const anonClient = createClient(TEST_URL!, TEST_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: signIn, error: signInErr } = await anonClient.auth.signInWithPassword({ email, password })
  if (signInErr || !signIn.session) throw new Error(`signIn failed: ${signInErr?.message}`)

  return {
    id:          userId,
    email,
    password,
    accessToken: signIn.session.access_token,
    client:      userClient(signIn.session.access_token),
  }
}

/** Deletes a test user (cleanup). */
export async function deleteTestUser(userId: string) {
  const admin = adminClient()
  await admin.auth.admin.deleteUser(userId)
}
