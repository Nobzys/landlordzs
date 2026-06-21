'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  accountRecoverySchema,
  confirmEmailSchema,
  phoneSchema,
  phoneOtpSchema,
  basicProfileSchema,
  agentProfileSchema,
  vendorProfileSchema,
  professionalProfileSchema,
} from '@/lib/validations/auth'
import { ROLE_DASHBOARDS, APP_URL, APPROVAL_REQUIRED_ROLES } from '@/lib/utils/constants'
import type { ActionResult } from '@/types/auth'
import type { UserRole } from '@/types/auth'
import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  AccountRecoveryInput,
  ConfirmEmailInput,
  PhoneInput,
  PhoneOtpInput,
  BasicProfileInput,
  AgentProfileInput,
  VendorProfileInput,
  ProfessionalProfileInput,
} from '@/lib/validations/auth'

const PASSWORD_RESET_RATE_LIMIT       = 3
const PASSWORD_RESET_RATE_WINDOW_MS   = 15 * 60 * 1000

async function getClientIp(): Promise<string> {
  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() ?? 'unknown'
}

// â”€â”€â”€ Sign In â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function signIn(
  data: LoginInput
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email:    parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    // Supabase returns "invalid login credentials" for BOTH bad password AND
    // unconfirmed email â€” there is no way to distinguish them from the error
    // alone, so we give a neutral message and surface the verification hint.
    if (msg.includes('email not confirmed')) {
      return { error: 'Please verify your email address before signing in.' }
    }
    if (msg.includes('invalid login credentials')) {
      return {
        error:
          'Invalid email or password. If you just registered, check your inbox for a verification link first.',
      }
    }
    return { error: error.message }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in failed. Please try again.' }

  // profiles_safe (not the base table) — see 20260624000001_profiles_safe_view.sql
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles_safe')
    .select('role, onboarding_completed, account_status')
    .eq('id', user.id)
    .single() as { data: { role: string; onboarding_completed: boolean; account_status: string } | null }

  if (profile?.account_status === 'suspended' || profile?.account_status === 'banned') {
    await supabase.auth.signOut()
    return { error: 'Your account has been suspended. Contact support@landlordzs.com' }
  }

  revalidatePath('/', 'layout')

  const redirectTo = !profile?.onboarding_completed
    ? '/onboarding'
    : (ROLE_DASHBOARDS[(profile?.role ?? 'buyer') as UserRole] ?? '/account')

  return { success: true, data: { redirectTo } }
}

// â”€â”€â”€ Sign Up â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Returns skipVerification:true when the admin path is used (no email needed).
// Returns sessionCreated:true when Supabase itself returned a session (i.e.
// the project's "Confirm email" setting is OFF) — only then is the user
// actually authenticated by signUp().
export async function signUp(
  data: RegisterInput
): Promise<ActionResult<{ email: string; skipVerification?: boolean; sessionCreated?: boolean; redirectTo?: string }>> {
  const parsed = registerSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { full_name, email, password, role } = parsed.data

  // â”€â”€ Path A: admin creates user pre-confirmed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // No verification email is sent. User can sign in immediately after.
  // Explicit opt-in only: SUPABASE_SERVICE_ROLE_KEY is configured in every
  // real deployment (it's required for RBAC, password-reset rate limiting,
  // and account recovery elsewhere in this codebase), so gating on its mere
  // presence silently bypassed Supabase's "Confirm email" project setting
  // for every signup. SKIP_EMAIL_VERIFICATION must be explicitly set to
  // 'true' (e.g. for local/dev environments without SMTP configured) — it
  // must never be set in production.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SKIP_EMAIL_VERIFICATION === 'true') {
    const admin = createAdminClient()
    const { data: created, error: adminErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    })

    if (adminErr) {
      if (
        adminErr.message.toLowerCase().includes('already registered') ||
        adminErr.message.toLowerCase().includes('already been registered') ||
        adminErr.status === 422
      ) {
        return { error: 'An account with this email already exists.' }
      }
      return { error: adminErr.message }
    }

    const requiresApproval = (APPROVAL_REQUIRED_ROLES as readonly string[]).includes(role)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('profiles').upsert(
      {
        id:             created.user.id,
        email,
        full_name,
        role,
        account_status: requiresApproval ? 'pending_verification' : 'active',
      },
      { onConflict: 'id' }
    )

    return { success: true, data: { email, skipVerification: true } }
  }

  // â”€â”€ Path B: standard signup â€” Supabase sends a verification email â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Use the request Host header so the link in the email always points to the
  // actual server, not the APP_URL constant (which defaults to localhost:3000).
  const headersList = await headers()
  const host =
    headersList.get('x-forwarded-host') ??
    headersList.get('host') ??
    'localhost:3000'
  const proto = host.startsWith('localhost') || /^127\.|^\[?::1]/.test(host) ? 'http' : 'https'
  const siteOrigin = `${proto}://${host}`

  const supabase = await createClient()
  const emailRedirectTo = `${siteOrigin}/api/auth/callback?next=/onboarding`
  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: { full_name, role },
    },
  })

  if (process.env.NODE_ENV !== 'production') {
    console.log('[signUp] Supabase response:', {
      emailRedirectTo,
      user:               authData.user,
      session:            authData.session,
      confirmation_sent_at: authData.user?.confirmation_sent_at ?? null,
      error:               error ? { message: error.message, status: error.status, code: error.code } : null,
    })
  }

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: 'An account with this email already exists.' }
    }
    return { error: error.message }
  }

  if (!authData.user) {
    return { error: 'Registration failed. Please try again.' }
  }

  // The existence of `authData.user` is NOT a successful login â€” Supabase
  // always returns a user object on signUp, confirmed or not. Only a
  // non-null `session` means Supabase actually authenticated the request,
  // which only happens when the project's "Confirm email" setting is OFF.
  if (authData.session) {
    revalidatePath('/', 'layout')
    return { success: true, data: { email, sessionCreated: true, redirectTo: '/onboarding' } }
  }

  // session is null â€” email confirmation is required. Do not redirect to
  // the dashboard and do not create a session manually; the user must
  // click the link Supabase just emailed them.
  return { success: true, data: { email } }
}

// â”€â”€â”€ Sign Out â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

// â”€â”€â”€ Forgot Password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function forgotPassword(
  data: ForgotPasswordInput
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const email = parsed.data.email
  const ip    = await getClientIp()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const since = new Date(Date.now() - PASSWORD_RESET_RATE_WINDOW_MS).toISOString()

  const [{ count: emailCount }, { count: ipCount }] = await Promise.all([
    admin
      .from('password_reset_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', since),
    admin
      .from('password_reset_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', since),
  ])

  if ((emailCount ?? 0) >= PASSWORD_RESET_RATE_LIMIT || (ipCount ?? 0) >= PASSWORD_RESET_RATE_LIMIT) {
    return { error: 'Too many requests. Please try again later.' }
  }

  await admin.from('password_reset_attempts').insert({ email, ip })

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${APP_URL}/api/auth/callback?next=/reset-password`,
  })

  if (error) return { error: error.message }

  // Return success regardless of whether the email exists (security best practice)
  return { success: true }
}

// ─── Account Recovery (capture-only) ───────────────────────────────────────

export async function submitAccountRecoveryRequest(
  data: AccountRecoveryInput
): Promise<ActionResult> {
  const parsed = accountRecoverySchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error } = await admin.from('account_recovery_requests').insert({
    full_name:         parsed.data.full_name,
    phone:              parsed.data.phone,
    alternative_email:  parsed.data.alternative_email,
    note:               parsed.data.note || null,
  })

  if (error) return { error: 'Could not submit your request. Please try again.' }

  return { success: true }
}

// â”€â”€â”€ Confirm Email (click-to-confirm, bot/scanner-resistant) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Called only when the user explicitly clicks the "Confirm my email" button
// on /confirm — never on page load. Bare GET requests to that page (which is
// all an automated email-security scanner/prefetcher issues) render the
// button but never call this action, so the token is never consumed before
// a real human clicks it. Compare to the old flow, where the email linked
// directly to Supabase's own auto-consuming verify endpoint.
export async function confirmEmail(
  data: ConfirmEmailInput
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = confirmEmailSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp(parsed.data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true, data: { redirectTo: '/onboarding' } }
}

// â”€â”€â”€ Reset Password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function resetPassword(
  data: ResetPasswordInput
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = resetPasswordSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    if (error.message.toLowerCase().includes('same password')) {
      return { error: 'New password must be different from the current password.' }
    }
    return { error: error.message }
  }

  const { data: { user } } = await supabase.auth.getUser()
  // profiles_safe (not the base table) — see 20260624000001_profiles_safe_view.sql
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles_safe')
    .select('role, onboarding_completed')
    .eq('id', user!.id)
    .single() as { data: { role: string; onboarding_completed: boolean } | null }

  revalidatePath('/', 'layout')
  return {
    success: true,
    data: {
      redirectTo: profile?.onboarding_completed
        ? (ROLE_DASHBOARDS[(profile?.role ?? 'buyer') as UserRole] ?? '/account')
        : '/onboarding',
    },
  }
}

// â”€â”€â”€ Send Phone OTP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function sendPhoneOtp(data: PhoneInput): Promise<ActionResult> {
  const parsed = phoneSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    phone: parsed.data.phone,
  })

  if (error) return { error: error.message }
  return { success: true }
}

// â”€â”€â”€ Verify Phone OTP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function verifyPhoneOtp(data: PhoneOtpInput): Promise<ActionResult> {
  const parsed = phoneOtpSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.token,
    type:  'sms',
  })

  if (error) {
    if (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('expired')) {
      return { error: 'Invalid or expired OTP. Please request a new one.' }
    }
    return { error: error.message }
  }

  // Mark phone as verified on profile
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('profiles')
      .update({ phone: parsed.data.phone, phone_verified: true })
      .eq('id', user.id)
  }

  revalidatePath('/account', 'layout')
  return { success: true }
}

// â”€â”€â”€ Resend Verification Email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function resendVerificationEmail(email: string): Promise<ActionResult> {
  if (!email || !email.includes('@')) {
    return { error: 'Invalid email address.' }
  }

  const supabase = await createClient()
  const emailRedirectTo = `${APP_URL}/api/auth/callback?next=/onboarding`
  const { error } = await supabase.auth.resend({
    type:  'signup',
    email,
    options: { emailRedirectTo },
  })

  if (process.env.NODE_ENV !== 'production') {
    console.log('[resendVerificationEmail] Supabase response:', {
      email,
      emailRedirectTo,
      error: error ? { message: error.message, status: error.status, code: error.code } : null,
    })
  }

  if (error) return { error: error.message }
  return { success: true }
}

// â”€â”€â”€ Update Basic Profile (Onboarding Step 1) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function updateBasicProfile(
  data: BasicProfileInput
): Promise<ActionResult> {
  const parsed = basicProfileSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const update = {
    full_name:    parsed.data.full_name,
    display_name: parsed.data.display_name || parsed.data.full_name.split(' ')[0],
    city:         parsed.data.city,
    bio:          parsed.data.bio || null,
    ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('profiles')
    .update(update)
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/account', 'layout')
  return { success: true }
}

// â”€â”€â”€ Complete Agent Profile (Onboarding Step 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function completeAgentProfile(
  data: AgentProfileInput
): Promise<ActionResult> {
  const parsed = agentProfileSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('agent_profiles').upsert(
    {
      id:               user.id,
      experience_years: parsed.data.experience_years,
      specializations:  parsed.data.specializations,
      commission_rate:  parsed.data.commission_rate ?? 3.0,
      license_number:   parsed.data.license_number ?? null,
      service_areas:    parsed.data.service_areas ?? [],
      bio:              '',
    },
    { onConflict: 'id' }
  )

  if (error) return { error: error.message }

  // Mark account as pending verification — lifted to active on admin approval
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('profiles')
    .update({ account_status: 'pending_verification' })
    .eq('id', user.id)

  return { success: true }
}

// â”€â”€â”€ Complete Vendor Profile (Onboarding Step 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function completeVendorProfile(
  data: VendorProfileInput
): Promise<ActionResult> {
  const parsed = vendorProfileSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const slug = parsed.data.store_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('vendor_profiles').upsert(
    {
      id:                user.id,
      store_name:        parsed.data.store_name,
      store_slug:        slug,
      store_description: parsed.data.store_description ?? null,
    },
    { onConflict: 'id' }
  )

  if (error) return { error: error.message }
  return { success: true }
}

// â”€â”€â”€ Complete Professional Profile (Onboarding Step 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Used by contractor | engineer | architect | lawyer

export async function completeProfessionalProfile(
  data: ProfessionalProfileInput,
  professionType: 'contractor' | 'engineer' | 'architect' | 'lawyer'
): Promise<ActionResult> {
  const parsed = professionalProfileSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('professional_profiles').upsert(
    {
      id:               user.id,
      profession_type:  professionType,
      company_name:     parsed.data.company_name ?? null,
      specializations:  parsed.data.specializations,
      experience_years: parsed.data.experience_years,
      day_rate:         parsed.data.day_rate ?? null,
      license_number:   parsed.data.license_number ?? null,
      service_areas:    parsed.data.service_areas ?? [],
      is_available:     true,
    },
    { onConflict: 'id' }
  )

  if (error) return { error: error.message }

  // Mark account as pending verification — lifted to active on admin approval
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('profiles')
    .update({ account_status: 'pending_verification' })
    .eq('id', user.id)

  return { success: true }
}

// â”€â”€â”€ Complete Onboarding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Called after all onboarding steps are done. Sets flag and redirects.

export async function completeOnboarding(): Promise<ActionResult<{ redirectTo: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ onboarding_completed: true, registration_completed_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { error: error.message }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  revalidatePath('/', 'layout')
  return {
    success: true,
    data: {
      redirectTo: ROLE_DASHBOARDS[(profile?.role ?? 'buyer') as UserRole] ?? '/account',
    },
  }
}

// â”€â”€â”€ Update Password (from Account settings) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function updatePassword(data: ChangePasswordInput): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  // Re-authenticate with current password first
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Not authenticated.' }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email:    user.email,
    password: parsed.data.current_password,
  })
  if (verifyError) return { error: 'Current password is incorrect.' }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.new_password })
  if (error) return { error: error.message }

  return { success: true }
}

// â”€â”€â”€ Admin: Assign Role â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function adminAssignRole(
  targetUserId: string,
  newRole: UserRole
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Verify caller is admin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: callerProfile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (callerProfile?.role !== 'admin') {
    return { error: 'Insufficient permissions.' }
  }

  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prevProfile } = await (adminClient as any)
    .from('profiles')
    .select('role')
    .eq('id', targetUserId)
    .single() as { data: { role: string } | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  // Log admin action
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('admin_logs').insert({
    actor_id:    user.id,
    action:      'assign_role',
    target_type: 'profile',
    target_id:   targetUserId,
    old_data:    { role: prevProfile?.role ?? null },
    new_data:    { role: newRole },
  })

  revalidatePath('/admin/users')
  return { success: true }
}

// â”€â”€â”€ Admin: Suspend Account â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function adminSuspendAccount(
  targetUserId: string,
  reason: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: callerProfile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (callerProfile?.role !== 'admin') {
    return { error: 'Insufficient permissions.' }
  }

  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('profiles')
    .update({ account_status: 'suspended' })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  // Log admin action
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('admin_logs').insert({
    actor_id:    user.id,
    action:      'suspend_account',
    target_type: 'profile',
    target_id:   targetUserId,
    new_data:    { reason },
  })

  // Store user-visible suspension reason
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from('account_notices').insert({
    user_id:    targetUserId,
    type:       'suspension',
    reason,
    created_by: user.id,
  })

  revalidatePath('/admin/users')
  return { success: true }
}

// â”€â”€â”€ Admin: Activate Account â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function adminActivateAccount(
  targetUserId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: callerProfile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (callerProfile?.role !== 'admin') {
    return { error: 'Insufficient permissions.' }
  }

  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('profiles')
    .update({ account_status: 'active' })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  // Log admin action
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('admin_logs').insert({
    actor_id:    user.id,
    action:      'activate_account',
    target_type: 'profile',
    target_id:   targetUserId,
  })

  revalidatePath('/admin/users')
  return { success: true }
}

// ─── Submit KYC Documents (called after client-side storage upload) ───────────

export async function submitKycDocuments(data: {
  national_id_front: string
  national_id_back: string
  professional_cert: string | null
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('kyc_records').insert({
    user_id:           user.id,
    level:             'basic',
    status:            'pending',
    national_id_front: data.national_id_front,
    national_id_back:  data.national_id_back,
    business_reg:      data.professional_cert ?? null,
    submitted_at:      new Date().toISOString(),
  })

  if (error) return { error: error.message }
  return { success: true }
}

// ─── Admin: Approve Professional ──────────────────────────────────────────────

export async function adminApproveProfessional(
  targetUserId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: callerProfile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (callerProfile?.role !== 'admin') return { error: 'Insufficient permissions.' }

  const adminClient = createAdminClient()

  // Get target role to update the right table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: target } = await (adminClient as any)
    .from('profiles')
    .select('role')
    .eq('id', targetUserId)
    .single() as { data: { role: string } | null }

  const now = new Date().toISOString()

  // Activate account
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('profiles')
    .update({ account_status: 'active', approved_at: now, approved_by: user.id })
    .eq('id', targetUserId)

  // Set verified flag on role-specific table
  if (target?.role === 'agent') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('agent_profiles')
      .update({ license_verified: true })
      .eq('id', targetUserId)
  } else if (['contractor', 'engineer', 'architect', 'lawyer'].includes(target?.role ?? '')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('professional_profiles')
      .update({ is_verified: true, license_verified: true })
      .eq('id', targetUserId)
  }

  // Mark latest pending KYC record as approved
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kyc } = await (adminClient as any)
    .from('kyc_records')
    .select('id')
    .eq('user_id', targetUserId)
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single() as { data: { id: string } | null }

  if (kyc) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('kyc_records')
      .update({ status: 'approved', reviewed_by: user.id, reviewed_at: now })
      .eq('id', kyc.id)
  }

  // Log admin action
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('admin_logs').insert({
    actor_id:    user.id,
    action:      'approve_professional',
    target_type: 'profile',
    target_id:   targetUserId,
    new_data:    { role: target?.role ?? null },
  })

  revalidatePath('/admin/professionals')
  return { success: true }
}

// ─── Admin: Reject Professional ───────────────────────────────────────────────

export async function adminRejectProfessional(
  targetUserId: string,
  reason: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: callerProfile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (callerProfile?.role !== 'admin') return { error: 'Insufficient permissions.' }

  const adminClient = createAdminClient()
  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kyc } = await (adminClient as any)
    .from('kyc_records')
    .select('id')
    .eq('user_id', targetUserId)
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single() as { data: { id: string } | null }

  const effectiveReason = reason || 'Documents did not meet requirements.'

  if (kyc) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('kyc_records')
      .update({
        status:       'rejected',
        review_notes: effectiveReason,
        reviewed_by:  user.id,
        reviewed_at:  now,
      })
      .eq('id', kyc.id)
  }

  // Store user-visible rejection reason
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from('account_notices').insert({
    user_id:    targetUserId,
    type:       'rejection',
    reason:     effectiveReason,
    created_by: user.id,
  })

  // account_status stays pending_verification so they can resubmit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('profiles')
    .update({ rejected_at: now, rejected_by: user.id })
    .eq('id', targetUserId)

  // Log admin action
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('admin_logs').insert({
    actor_id:    user.id,
    action:      'reject_professional',
    target_type: 'profile',
    target_id:   targetUserId,
    new_data:    { reason: effectiveReason },
  })

  revalidatePath('/admin/professionals')
  return { success: true }
}

// ─── Submit Correction Request / Appeal ───────────────────────────────────────

export async function submitAppeal(
  message: string,
  noticeId: string | null,
): Promise<ActionResult> {
  if (!message?.trim()) return { error: 'Message is required.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('account_appeals').insert({
    user_id:   user.id,
    notice_id: noticeId,
    message:   message.trim(),
  })

  if (error) return { error: error.message }
  return { success: true }
}
