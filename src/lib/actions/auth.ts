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
  PhoneInput,
  PhoneOtpInput,
  BasicProfileInput,
  AgentProfileInput,
  VendorProfileInput,
  ProfessionalProfileInput,
} from '@/lib/validations/auth'

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
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
export async function signUp(
  data: RegisterInput
): Promise<ActionResult<{ email: string; skipVerification?: boolean }>> {
  const parsed = registerSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { full_name, email, password, role } = parsed.data

  // â”€â”€ Path A: admin creates user pre-confirmed (SUPABASE_SERVICE_ROLE_KEY set) â”€
  // No verification email is sent. User can sign in immediately after.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
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
  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteOrigin}/api/auth/callback?next=/onboarding`,
      data: { full_name, role },
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: 'An account with this email already exists.' }
    }
    return { error: error.message }
  }

  if (!authData.user) {
    return { error: 'Registration failed. Please try again.' }
  }

  // Best-effort profile upsert â€” the DB trigger also creates this row,
  // but doing it here ensures it exists before the verification email arrives.
  // Silently skipped when service role key is absent (covered by DB trigger).
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

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${APP_URL}/api/auth/callback?next=/reset-password`,
  })

  if (error) return { error: error.message }

  // Return success regardless of whether the email exists (security best practice)
  return { success: true }
}

// â”€â”€â”€ Reset Password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
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
  const { error } = await supabase.auth.resend({
    type:  'signup',
    email,
    options: {
      emailRedirectTo: `${APP_URL}/api/auth/callback?next=/onboarding`,
    },
  })

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
    .update({ onboarding_completed: true })
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

export async function updatePassword(data: {
  current_password: string
  new_password: string
}): Promise<ActionResult> {
  const supabase = await createClient()

  // Re-authenticate with current password first
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Not authenticated.' }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email:    user.email,
    password: data.current_password,
  })
  if (verifyError) return { error: 'Current password is incorrect.' }

  const { error } = await supabase.auth.updateUser({ password: data.new_password })
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
  const { error } = await (adminClient as any)
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

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
    .update({ account_status: 'active' })
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
