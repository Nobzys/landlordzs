'use server'

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
import { ROLE_DASHBOARDS, APP_URL } from '@/lib/utils/constants'
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

// ─── Sign In ──────────────────────────────────────────────────────────────────

export async function signIn(
  data: LoginInput
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email:    parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return { error: 'Please verify your email address before signing in.' }
    }
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      return { error: 'Invalid email or password.' }
    }
    return { error: error.message }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in failed. Please try again.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_completed, account_status')
    .eq('id', user.id)
    .single()

  if (profile?.account_status === 'suspended' || profile?.account_status === 'banned') {
    await supabase.auth.signOut()
    return { error: 'Your account has been suspended. Contact support@landlordzs.com' }
  }

  revalidatePath('/', 'layout')

  const redirectTo = !profile?.onboarding_completed
    ? '/onboarding'
    : (ROLE_DASHBOARDS[profile.role as UserRole] ?? '/account')

  return { success: true, data: { redirectTo } }
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────

export async function signUp(
  data: RegisterInput
): Promise<ActionResult<{ email: string }>> {
  const parsed = registerSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { full_name, email, password, role } = parsed.data

  const supabase = await createClient()
  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${APP_URL}/api/auth/callback?next=/onboarding`,
      data: {
        full_name,
        role,
      },
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

  // Create the profile row immediately using the service role so it exists
  // before the user clicks the verification link — regardless of whether
  // email confirmation is required (authData.session may be null).
  try {
    const admin = createAdminClient()
    await admin.from('profiles').upsert(
      {
        id:        authData.user.id,
        email:     authData.user.email ?? email,
        full_name,
        role,
      },
      { onConflict: 'id' }
    )
  } catch {
    // Service role key not configured or table not yet created.
    // getServerProfile() will synthesise a provisional profile from
    // user_metadata so onboarding can still render.
  }

  return { success: true, data: { email } }
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export async function forgotPassword(
  data: ForgotPasswordInput
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${APP_URL}/api/auth/callback?next=/reset-password`,
  })

  if (error) return { error: error.message }

  // Return success regardless of whether the email exists (security best practice)
  return { success: true }
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export async function resetPassword(
  data: ResetPasswordInput
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = resetPasswordSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
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
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_completed')
    .eq('id', user!.id)
    .single()

  revalidatePath('/', 'layout')
  return {
    success: true,
    data: {
      redirectTo: profile?.onboarding_completed
        ? (ROLE_DASHBOARDS[profile.role as UserRole] ?? '/account')
        : '/onboarding',
    },
  }
}

// ─── Send Phone OTP ───────────────────────────────────────────────────────────

export async function sendPhoneOtp(data: PhoneInput): Promise<ActionResult> {
  const parsed = phoneSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    phone: parsed.data.phone,
  })

  if (error) return { error: error.message }
  return { success: true }
}

// ─── Verify Phone OTP ─────────────────────────────────────────────────────────

export async function verifyPhoneOtp(data: PhoneOtpInput): Promise<ActionResult> {
  const parsed = phoneOtpSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
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
    await supabase
      .from('profiles')
      .update({ phone: parsed.data.phone, phone_verified: true })
      .eq('id', user.id)
  }

  revalidatePath('/account', 'layout')
  return { success: true }
}

// ─── Resend Verification Email ────────────────────────────────────────────────

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

// ─── Update Basic Profile (Onboarding Step 1) ────────────────────────────────

export async function updateBasicProfile(
  data: BasicProfileInput
): Promise<ActionResult> {
  const parsed = basicProfileSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
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

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/account', 'layout')
  return { success: true }
}

// ─── Complete Agent Profile (Onboarding Step 2) ───────────────────────────────

export async function completeAgentProfile(
  data: AgentProfileInput
): Promise<ActionResult> {
  const parsed = agentProfileSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase.from('agent_profiles').upsert(
    {
      id:               user.id,
      experience_years: parsed.data.experience_years,
      specializations:  parsed.data.specializations,
      commission_rate:  parsed.data.commission_rate ?? 3.0,
      bio:              '', // already saved in profiles.bio
    },
    { onConflict: 'id' }
  )

  if (error) return { error: error.message }
  return { success: true }
}

// ─── Complete Vendor Profile (Onboarding Step 2) ──────────────────────────────

export async function completeVendorProfile(
  data: VendorProfileInput
): Promise<ActionResult> {
  const parsed = vendorProfileSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const slug = parsed.data.store_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { error } = await supabase.from('vendor_profiles').upsert(
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

// ─── Complete Professional Profile (Onboarding Step 2) ────────────────────────
// Used by contractor | engineer | architect | lawyer

export async function completeProfessionalProfile(
  data: ProfessionalProfileInput,
  professionType: 'contractor' | 'engineer' | 'architect' | 'lawyer'
): Promise<ActionResult> {
  const parsed = professionalProfileSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase.from('professional_profiles').upsert(
    {
      id:               user.id,
      profession_type:  professionType,
      company_name:     parsed.data.company_name ?? null,
      specializations:  parsed.data.specializations,
      experience_years: parsed.data.experience_years,
      day_rate:         parsed.data.day_rate ?? null,
      is_available:     true,
    },
    { onConflict: 'id' }
  )

  if (error) return { error: error.message }
  return { success: true }
}

// ─── Complete Onboarding ──────────────────────────────────────────────────────
// Called after all onboarding steps are done. Sets flag and redirects.

export async function completeOnboarding(): Promise<ActionResult<{ redirectTo: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', user.id)

  if (error) return { error: error.message }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  revalidatePath('/', 'layout')
  return {
    success: true,
    data: {
      redirectTo: ROLE_DASHBOARDS[profile?.role as UserRole] ?? '/account',
    },
  }
}

// ─── Update Password (from Account settings) ─────────────────────────────────

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

// ─── Admin: Assign Role ───────────────────────────────────────────────────────

export async function adminAssignRole(
  targetUserId: string,
  newRole: UserRole
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Verify caller is admin
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return { error: 'Insufficient permissions.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

// ─── Admin: Suspend Account ───────────────────────────────────────────────────

export async function adminSuspendAccount(
  targetUserId: string,
  reason: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return { error: 'Insufficient permissions.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ account_status: 'suspended' })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  // Log admin action
  await supabase.from('admin_logs').insert({
    actor_id:    user.id,
    action:      'suspend_account',
    target_type: 'profile',
    target_id:   targetUserId,
    new_data:    { reason },
  })

  revalidatePath('/admin/users')
  return { success: true }
}
