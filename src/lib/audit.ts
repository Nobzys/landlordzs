'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export interface AuditEventParams {
  userId?: string
  adminId?: string
  actionType: string
  entityType?: string
  entityId?: string
  previousValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

async function getRequestMeta(): Promise<{ ip: string | null; ua: string | null }> {
  try {
    const h = await headers()
    const ip =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      h.get('x-real-ip') ??
      null
    const ua = h.get('user-agent') ?? null
    return { ip, ua }
  } catch {
    return { ip: null, ua: null }
  }
}

// Log a security-significant event to audit_logs.
// Pass adminClient if one has already been created in the calling action.
export async function logAuditEvent(
  params: AuditEventParams,
  adminClient?: AdminClient,
): Promise<void> {
  try {
    const client = adminClient ?? createAdminClient()
    const { ip, ua } = await getRequestMeta()

    await (client as any).from('audit_logs').insert({
      user_id:         params.userId    ?? null,
      admin_id:        params.adminId   ?? null,
      action_type:     params.actionType,
      entity_type:     params.entityType   ?? null,
      entity_id:       params.entityId     ?? null,
      previous_values: params.previousValues ?? null,
      new_values:      params.newValues      ?? null,
      ip_address:      ip,
      user_agent:      ua,
      metadata:        params.metadata ?? {},
    })
  } catch (err) {
    // Audit failures must never block the primary action
    console.error('[logAuditEvent]', params.actionType, err)
  }
}

// Convenience: log an admin action and also write to the existing admin_logs table
// to maintain backward compatibility with existing admin dashboard queries.
export async function logAdminAction(
  adminClient: AdminClient,
  params: {
    actorId:     string
    action:      string
    targetType?: string
    targetId?:   string
    oldData?:    Record<string, unknown>
    newData?:    Record<string, unknown>
    metadata?:   Record<string, unknown>
  },
): Promise<void> {
  const { ip, ua } = await getRequestMeta()

  await Promise.allSettled([
    // Existing admin_logs (backward compat)
    (adminClient as any).from('admin_logs').insert({
      actor_id:    params.actorId,
      action:      params.action,
      target_type: params.targetType ?? null,
      target_id:   params.targetId   ?? null,
      old_data:    params.oldData    ?? null,
      new_data:    params.newData    ?? null,
      ip_address:  ip,
      user_agent:  ua,
    }),

    // New audit_logs
    (adminClient as any).from('audit_logs').insert({
      admin_id:        params.actorId,
      action_type:     params.action,
      entity_type:     params.targetType   ?? null,
      entity_id:       params.targetId     ?? null,
      previous_values: params.oldData      ?? null,
      new_values:      params.newData      ?? null,
      ip_address:      ip,
      user_agent:      ua,
      metadata:        params.metadata     ?? {},
    }),
  ])
}
