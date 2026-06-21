'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/types/auth'

async function getClientIp(): Promise<string> {
  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() ?? 'unknown'
}

async function requireAdmin(): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: caller } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (caller?.role !== 'admin') return { error: 'Insufficient permissions.' }
  return { id: user.id }
}

async function setRoleVerifiedFlag(targetUserId: string, role: string | null) {
  const adminClient = createAdminClient()

  if (role === 'agent') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('agent_profiles')
      .update({ license_verified: true })
      .eq('id', targetUserId)
  } else if (['contractor', 'engineer', 'architect', 'lawyer'].includes(role ?? '')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('professional_profiles')
      .update({ is_verified: true, license_verified: true })
      .eq('id', targetUserId)
  } else if (role === 'vendor') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('vendor_profiles')
      .update({ is_verified: true })
      .eq('id', targetUserId)
  }
}

async function notify(targetUserId: string, title: string, body: string, actionUrl: string) {
  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from('notifications').insert({
    user_id:    targetUserId,
    type:       'verification',
    title,
    body,
    action_url: actionUrl,
  })
}

// ─── Approve Verification ──────────────────────────────────────────────────

export async function adminApproveVerification(
  kycId: string,
  targetUserId: string
): Promise<ActionResult> {
  const caller = await requireAdmin()
  if ('error' in caller) return caller

  const adminClient = createAdminClient()
  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kyc } = await (adminClient as any)
    .from('kyc_records')
    .select('status, user_id')
    .eq('id', kycId)
    .single() as { data: { status: string; user_id: string } | null }

  if (!kyc) return { error: 'Verification request not found.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: target } = await (adminClient as any)
    .from('profiles')
    .select('role')
    .eq('id', targetUserId)
    .single() as { data: { role: string } | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('kyc_records')
    .update({ status: 'approved', reviewed_by: caller.id, reviewed_at: now })
    .eq('id', kycId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('profiles')
    .update({ is_verified: true, verified_at: now, account_status: 'active', approved_at: now, approved_by: caller.id })
    .eq('id', targetUserId)

  await setRoleVerifiedFlag(targetUserId, target?.role ?? null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from('verification_audit_logs').insert({
    verification_id: kycId,
    admin_id:        caller.id,
    previous_status: kyc.status,
    new_status:      'approved',
    action:          'approve',
  })

  await notify(targetUserId, 'Verification approved', 'Your account has been verified. The verified badge is now visible on your profile.', '/account/profile')

  revalidatePath('/admin/verifications')
  revalidatePath(`/admin/verifications/${kycId}`)
  revalidatePath(`/admin/users/${targetUserId}`)
  return { success: true }
}

// ─── Reject Verification ───────────────────────────────────────────────────

export async function adminRejectVerification(
  kycId: string,
  targetUserId: string,
  reason: string
): Promise<ActionResult> {
  if (!reason?.trim()) return { error: 'A rejection reason is required.' }

  const caller = await requireAdmin()
  if ('error' in caller) return caller

  const adminClient = createAdminClient()
  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kyc } = await (adminClient as any)
    .from('kyc_records')
    .select('status')
    .eq('id', kycId)
    .single() as { data: { status: string } | null }

  if (!kyc) return { error: 'Verification request not found.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('kyc_records')
    .update({ status: 'rejected', review_notes: reason, reviewed_by: caller.id, reviewed_at: now })
    .eq('id', kycId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('profiles')
    .update({ rejected_at: now, rejected_by: caller.id })
    .eq('id', targetUserId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from('account_notices').insert({
    user_id:    targetUserId,
    type:       'rejection',
    reason,
    created_by: caller.id,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from('verification_audit_logs').insert({
    verification_id: kycId,
    admin_id:        caller.id,
    previous_status: kyc.status,
    new_status:      'rejected',
    action:          'reject',
    notes:           reason,
  })

  await notify(targetUserId, 'Verification rejected', reason, '/account/profile')

  revalidatePath('/admin/verifications')
  revalidatePath(`/admin/verifications/${kycId}`)
  revalidatePath(`/admin/users/${targetUserId}`)
  return { success: true }
}

// ─── Request Additional Information ────────────────────────────────────────

export async function adminRequestMoreInfo(
  kycId: string,
  targetUserId: string,
  message: string
): Promise<ActionResult> {
  if (!message?.trim()) return { error: 'A message describing what is needed is required.' }

  const caller = await requireAdmin()
  if ('error' in caller) return caller

  const adminClient = createAdminClient()
  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kyc } = await (adminClient as any)
    .from('kyc_records')
    .select('status')
    .eq('id', kycId)
    .single() as { data: { status: string } | null }

  if (!kyc) return { error: 'Verification request not found.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('kyc_records')
    .update({ status: 'needs_more_info', review_notes: message, reviewed_by: caller.id, reviewed_at: now })
    .eq('id', kycId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from('account_notices').insert({
    user_id:    targetUserId,
    type:       'rejection',
    reason:     message,
    created_by: caller.id,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from('verification_audit_logs').insert({
    verification_id: kycId,
    admin_id:        caller.id,
    previous_status: kyc.status,
    new_status:      'needs_more_info',
    action:          'request_more_info',
    notes:           message,
  })

  await notify(targetUserId, 'Additional information needed', message, '/account/profile')

  revalidatePath('/admin/verifications')
  revalidatePath(`/admin/verifications/${kycId}`)
  revalidatePath(`/admin/users/${targetUserId}`)
  return { success: true }
}

// ─── Add Internal Review Note (no status change) ───────────────────────────

export async function adminAddVerificationNote(kycId: string, note: string): Promise<ActionResult> {
  if (!note?.trim()) return { error: 'Note text is required.' }

  const caller = await requireAdmin()
  if ('error' in caller) return caller

  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kyc } = await (adminClient as any)
    .from('kyc_records')
    .select('status')
    .eq('id', kycId)
    .single() as { data: { status: string } | null }

  if (!kyc) return { error: 'Verification request not found.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from('verification_audit_logs').insert({
    verification_id: kycId,
    admin_id:        caller.id,
    previous_status: kyc.status,
    new_status:      kyc.status,
    action:          'note',
    notes:           note,
  })

  revalidatePath(`/admin/verifications/${kycId}`)
  return { success: true }
}

// ─── Verify Manually (no KYC record required) ──────────────────────────────

export async function adminVerifyManually(targetUserId: string): Promise<ActionResult> {
  const caller = await requireAdmin()
  if ('error' in caller) return caller

  const adminClient = createAdminClient()
  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: target } = await (adminClient as any)
    .from('profiles')
    .select('role')
    .eq('id', targetUserId)
    .single() as { data: { role: string } | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('profiles')
    .update({ is_verified: true, verified_at: now })
    .eq('id', targetUserId)

  await setRoleVerifiedFlag(targetUserId, target?.role ?? null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from('admin_logs').insert({
    actor_id:    caller.id,
    action:      'verify_manually',
    target_type: 'profile',
    target_id:   targetUserId,
  })

  revalidatePath(`/admin/users/${targetUserId}`)
  return { success: true }
}

// ─── Reset User Password ───────────────────────────────────────────────────

export async function adminResetUserPassword(targetUserId: string): Promise<ActionResult> {
  const caller = await requireAdmin()
  if ('error' in caller) return caller

  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: target } = await (adminClient as any)
    .from('profiles')
    .select('email')
    .eq('id', targetUserId)
    .single() as { data: { email: string } | null }

  if (!target?.email) return { error: 'User has no email on file.' }

  const { error } = await adminClient.auth.admin.generateLink({
    type:  'recovery',
    email: target.email,
  })
  if (error) return { error: error.message }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from('admin_logs').insert({
    actor_id:    caller.id,
    action:      'reset_password',
    target_type: 'profile',
    target_id:   targetUserId,
  })

  return { success: true }
}

// ─── User Preview Mode (read-only, no auth-token changes) ──────────────────

export async function startUserPreview(targetUserId: string): Promise<ActionResult<{ logId: string }>> {
  const caller = await requireAdmin()
  if ('error' in caller) return caller

  const adminClient = createAdminClient()
  const ip = await getClientIp()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminClient as any)
    .from('admin_impersonation_logs')
    .insert({ admin_id: caller.id, target_user_id: targetUserId, ip_address: ip })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (error || !data) return { error: error?.message ?? 'Could not start preview.' }
  return { success: true, data: { logId: data.id } }
}

export async function endUserPreview(logId: string): Promise<ActionResult> {
  const caller = await requireAdmin()
  if ('error' in caller) return caller

  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('admin_impersonation_logs')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', logId)
    .eq('admin_id', caller.id)

  return { success: true }
}
