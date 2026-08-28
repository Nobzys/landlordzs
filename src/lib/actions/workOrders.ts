'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createWorkOrderSchema, completeWorkOrderSchema } from '@/lib/validations/workOrder'
import type { ActionResult } from '@/types/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkOrderStatus =
  | 'dispatched'
  | 'accepted'
  | 'declined'
  | 'in_progress'
  | 'completed'
  | 'closed'
  | 'cancelled'
  | 'disputed'

export type WorkOrderPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface WorkOrderRow {
  id:                string
  property_id:       string
  assignment_id:     string | null
  owner_id:          string
  manager_id:        string
  worker_id:         string
  title:             string
  description:       string
  priority:          WorkOrderPriority
  category:          string | null
  status:            WorkOrderStatus
  due_date:          string | null
  dispatched_at:     string
  accepted_at:       string | null
  declined_at:       string | null
  started_at:        string | null
  completed_at:      string | null
  closed_at:         string | null
  cancelled_at:      string | null
  completion_notes:  string | null
  completion_photos: string[]
  parts_cost_xaf:    number | null
  currency:          string
  created_at:        string
  updated_at:        string
  property?: {
    id:      string
    title:   string
    city:    string
    address: string | null
  } | null
  worker?: {
    id:           string
    full_name:    string | null
    display_name: string | null
    email:        string
    avatar_url:   string | null
  } | null
  manager?: {
    id:           string
    full_name:    string | null
    display_name: string | null
    email:        string
  } | null
}

export interface MaintenanceWorkerResult {
  id:           string
  full_name:    string | null
  display_name: string | null
  email:        string
}

// ─── findMaintenanceWorkerByEmail ─────────────────────────────────────────────
// PM uses this to look up a maintenance worker before dispatching a work order.

export async function findMaintenanceWorkerByEmail(
  email: string,
): Promise<ActionResult<MaintenanceWorkerResult>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: caller } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!caller || caller.role !== 'property_manager') return { error: 'Unauthorized' }

  const { data: worker } = await (supabase as any)
    .from('profiles')
    .select('id, full_name, display_name, email, role, account_status')
    .ilike('email', email.trim())
    .single()

  if (!worker) return { error: 'No account found with this email address.' }
  if (worker.id === user.id) return { error: 'You cannot dispatch a work order to yourself.' }
  if (worker.role !== 'maintenance') {
    return { error: 'This account is not registered as a Maintenance Worker.' }
  }
  if (worker.account_status !== 'active') {
    return { error: 'This Maintenance Worker has not yet been approved by an administrator.' }
  }

  return {
    data: {
      id:           worker.id,
      full_name:    worker.full_name,
      display_name: worker.display_name,
      email:        worker.email,
    },
  }
}

// ─── createWorkOrder ──────────────────────────────────────────────────────────
// Property Manager dispatches a work order to a specific maintenance worker.
// manager_id and owner_id are derived server-side from auth and the active
// property_assignment row. Neither is ever sourced from client input.

export interface CreateWorkOrderPayload {
  propertyId:   string
  workerId:     string
  title:        string
  description:  string
  priority?:    WorkOrderPriority
  category?:    string | null
  dueDate?:     string | null
}

export async function createWorkOrder(
  payload: CreateWorkOrderPayload,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  // Verify caller is an active property_manager
  const { data: callerProfile } = await (supabase as any)
    .from('profiles')
    .select('role, account_status')
    .eq('id', user.id)
    .single()
  if (!callerProfile || callerProfile.role !== 'property_manager') {
    return { error: 'Only Property Managers can dispatch work orders.' }
  }
  if (callerProfile.account_status !== 'active') {
    return { error: 'Your account is not active.' }
  }

  // Validate input
  const parsed = createWorkOrderSchema.safeParse(payload)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { propertyId, workerId, title, description, priority, category, dueDate } = parsed.data

  // Verify caller has an active property_assignment for this property.
  // owner_id and assignment_id are derived from this row — never from client input.
  const { data: assignment } = await (supabase as any)
    .from('property_assignments')
    .select('id, owner_id')
    .eq('property_id', propertyId)
    .eq('manager_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!assignment) {
    return { error: 'You do not have an active management assignment for this property.' }
  }

  // Verify target is an approved maintenance worker
  const { data: worker } = await (supabase as any)
    .from('profiles')
    .select('role, account_status')
    .eq('id', workerId)
    .single()
  if (!worker || worker.role !== 'maintenance') {
    return { error: 'The selected user is not a Maintenance Worker.' }
  }
  if (worker.account_status !== 'active') {
    return { error: 'The selected Maintenance Worker has not yet been approved.' }
  }

  // INSERT via admin client — owner_id/manager_id are set from verified server-side data
  const admin = createAdminClient()
  const { data: wo, error: insertError } = await (admin as any)
    .from('maintenance_work_orders')
    .insert({
      property_id:   propertyId,
      assignment_id: assignment.id,
      owner_id:      assignment.owner_id,
      manager_id:    user.id,
      worker_id:     workerId,
      title:         title.trim(),
      description:   description.trim(),
      priority:      priority ?? 'normal',
      category:      category ?? null,
      status:        'dispatched',
      due_date:      dueDate ?? null,
    })
    .select('id')
    .single()
  if (insertError) return { error: insertError.message }

  revalidatePath('/property-manager/work-orders')
  revalidatePath('/maintenance/requests')
  return { data: { id: wo.id } }
}

// ─── respondToWorkOrder ───────────────────────────────────────────────────────
// Maintenance worker accepts or declines a dispatched work order.
// Blocked if: caller is not the assigned worker, or status is not 'dispatched'.

export async function respondToWorkOrder(
  workOrderId: string,
  response: 'accepted' | 'declined',
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: wo } = await (supabase as any)
    .from('maintenance_work_orders')
    .select('id, worker_id, status')
    .eq('id', workOrderId)
    .single() as { data: { id: string; worker_id: string; status: string } | null }
  if (!wo) return { error: 'Work order not found.' }
  if (wo.worker_id !== user.id) return { error: 'You are not assigned to this work order.' }
  if (wo.status !== 'dispatched') return { error: 'This work order is no longer awaiting a response.' }

  const now = new Date().toISOString()
  const patch = response === 'accepted'
    ? { status: 'accepted', accepted_at: now }
    : { status: 'declined', declined_at: now }

  const { error } = await (supabase as any)
    .from('maintenance_work_orders')
    .update(patch)
    .eq('id', workOrderId)
    .eq('worker_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/maintenance/requests')
  revalidatePath('/property-manager/work-orders')
  return {}
}

// ─── markWorkOrderStarted ─────────────────────────────────────────────────────
// Maintenance worker marks an accepted work order as in_progress.

export async function markWorkOrderStarted(workOrderId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: wo } = await (supabase as any)
    .from('maintenance_work_orders')
    .select('id, worker_id, status')
    .eq('id', workOrderId)
    .single() as { data: { id: string; worker_id: string; status: string } | null }
  if (!wo) return { error: 'Work order not found.' }
  if (wo.worker_id !== user.id) return { error: 'You are not assigned to this work order.' }
  if (wo.status !== 'accepted') {
    return { error: 'Work order must be in accepted status to mark as started.' }
  }

  const { error } = await (supabase as any)
    .from('maintenance_work_orders')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', workOrderId)
    .eq('worker_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/maintenance/requests')
  revalidatePath('/property-manager/work-orders')
  return {}
}

// ─── completeWorkOrder ────────────────────────────────────────────────────────
// Maintenance worker marks the job complete.
// photoUrls are storage paths already uploaded to the maintenance-photos bucket.
// partsCostXaf is optional; null means no parts were purchased.

export async function completeWorkOrder(
  workOrderId: string,
  completionNotes: string | null,
  photoUrls: string[],
  partsCostXaf: number | null,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const parsed = completeWorkOrderSchema.safeParse({ completionNotes, photoUrls, partsCostXaf })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data: wo } = await (supabase as any)
    .from('maintenance_work_orders')
    .select('id, worker_id, status')
    .eq('id', workOrderId)
    .single() as { data: { id: string; worker_id: string; status: string } | null }
  if (!wo) return { error: 'Work order not found.' }
  if (wo.worker_id !== user.id) return { error: 'You are not assigned to this work order.' }
  if (wo.status !== 'in_progress') {
    return { error: 'Work order must be in progress before marking complete.' }
  }

  const { error } = await (supabase as any)
    .from('maintenance_work_orders')
    .update({
      status:            'completed',
      completed_at:      new Date().toISOString(),
      completion_notes:  parsed.data.completionNotes ?? null,
      completion_photos: parsed.data.photoUrls,
      parts_cost_xaf:    parsed.data.partsCostXaf ?? null,
    })
    .eq('id', workOrderId)
    .eq('worker_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/maintenance/requests')
  revalidatePath('/property-manager/work-orders')
  return {}
}

// ─── closeWorkOrder ───────────────────────────────────────────────────────────
// Property Manager closes a completed work order (quality verified and accepted).

export async function closeWorkOrder(workOrderId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: wo } = await (supabase as any)
    .from('maintenance_work_orders')
    .select('id, manager_id, status')
    .eq('id', workOrderId)
    .single() as { data: { id: string; manager_id: string; status: string } | null }
  if (!wo) return { error: 'Work order not found.' }
  if (wo.manager_id !== user.id) {
    return { error: 'Only the dispatching Property Manager can close this work order.' }
  }
  if (wo.status !== 'completed') return { error: 'Only completed work orders can be closed.' }

  const { error } = await (supabase as any)
    .from('maintenance_work_orders')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', workOrderId)
    .eq('manager_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/property-manager/work-orders')
  revalidatePath('/maintenance/requests')
  return {}
}

// ─── cancelWorkOrder ──────────────────────────────────────────────────────────
// Property Manager cancels a work order.
// Allowed from: dispatched or accepted.
// Not allowed once work has started (in_progress or later).

export async function cancelWorkOrder(workOrderId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: wo } = await (supabase as any)
    .from('maintenance_work_orders')
    .select('id, manager_id, status')
    .eq('id', workOrderId)
    .single() as { data: { id: string; manager_id: string; status: string } | null }
  if (!wo) return { error: 'Work order not found.' }
  if (wo.manager_id !== user.id) {
    return { error: 'Only the dispatching Property Manager can cancel this work order.' }
  }
  if (!['dispatched', 'accepted'].includes(wo.status)) {
    return { error: 'Only dispatched or accepted work orders can be cancelled.' }
  }

  const { error } = await (supabase as any)
    .from('maintenance_work_orders')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', workOrderId)
    .eq('manager_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/property-manager/work-orders')
  revalidatePath('/maintenance/requests')
  return {}
}

// ─── disputeWorkOrder ─────────────────────────────────────────────────────────
// Property Manager disputes a completed work order (quality not acceptable).
// Resolution of disputes is deferred to a future phase.

export async function disputeWorkOrder(workOrderId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: wo } = await (supabase as any)
    .from('maintenance_work_orders')
    .select('id, manager_id, status')
    .eq('id', workOrderId)
    .single() as { data: { id: string; manager_id: string; status: string } | null }
  if (!wo) return { error: 'Work order not found.' }
  if (wo.manager_id !== user.id) {
    return { error: 'Only the dispatching Property Manager can dispute this work order.' }
  }
  if (wo.status !== 'completed') return { error: 'Only completed work orders can be disputed.' }

  const { error } = await (supabase as any)
    .from('maintenance_work_orders')
    .update({ status: 'disputed' })
    .eq('id', workOrderId)
    .eq('manager_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/property-manager/work-orders')
  revalidatePath('/maintenance/requests')
  return {}
}

// ─── getDispatchedWorkOrders ──────────────────────────────────────────────────
// Property Manager: fetch all work orders I have dispatched, enriched with
// property and assigned worker details.

export async function getDispatchedWorkOrders(): Promise<WorkOrderRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: rows } = await (supabase as any)
    .from('maintenance_work_orders')
    .select('*')
    .eq('manager_id', user.id)
    .order('created_at', { ascending: false })
  if (!rows?.length) return []

  const propertyIds = [...new Set<string>(rows.map((r: any) => r.property_id))]
  const workerIds   = [...new Set<string>(rows.map((r: any) => r.worker_id))]

  const { data: properties } = await (supabase as any)
    .from('properties')
    .select('id, title, city, address')
    .in('id', propertyIds)

  const { data: workers } = await (supabase as any)
    .from('profiles')
    .select('id, full_name, display_name, email, avatar_url')
    .in('id', workerIds)

  const propMap:   Record<string, any> = Object.fromEntries((properties ?? []).map((p: any) => [p.id, p]))
  const workerMap: Record<string, any> = Object.fromEntries((workers   ?? []).map((w: any) => [w.id, w]))

  return rows.map((r: any) => ({
    ...r,
    property: propMap[r.property_id]  ?? null,
    worker:   workerMap[r.worker_id]  ?? null,
  }))
}

// ─── getAssignedWorkOrders ────────────────────────────────────────────────────
// Maintenance worker: fetch all work orders assigned to me, enriched with
// property and dispatching manager details.

export async function getAssignedWorkOrders(): Promise<WorkOrderRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: rows } = await (supabase as any)
    .from('maintenance_work_orders')
    .select('*')
    .eq('worker_id', user.id)
    .order('created_at', { ascending: false })
  if (!rows?.length) return []

  const propertyIds = [...new Set<string>(rows.map((r: any) => r.property_id))]
  const managerIds  = [...new Set<string>(rows.map((r: any) => r.manager_id))]

  const { data: properties } = await (supabase as any)
    .from('properties')
    .select('id, title, city, address')
    .in('id', propertyIds)

  const { data: managers } = await (supabase as any)
    .from('profiles')
    .select('id, full_name, display_name, email')
    .in('id', managerIds)

  const propMap:    Record<string, any> = Object.fromEntries((properties ?? []).map((p: any) => [p.id, p]))
  const managerMap: Record<string, any> = Object.fromEntries((managers   ?? []).map((m: any) => [m.id, m]))

  return rows.map((r: any) => ({
    ...r,
    property: propMap[r.property_id]   ?? null,
    manager:  managerMap[r.manager_id] ?? null,
  }))
}

// ─── getWorkOrderById ─────────────────────────────────────────────────────────
// Fetch a single work order by ID.
// RLS restricts the result to work orders the caller is a party to;
// a non-party receives null (not a 403 — the query simply returns no rows).

export async function getWorkOrderById(id: string): Promise<WorkOrderRow | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: wo } = await (supabase as any)
    .from('maintenance_work_orders')
    .select('*')
    .eq('id', id)
    .single() as { data: WorkOrderRow | null }
  if (!wo) return null

  const [propRes, workerRes, managerRes] = await Promise.all([
    (supabase as any).from('properties').select('id, title, city, address').eq('id', wo.property_id).maybeSingle(),
    (supabase as any).from('profiles').select('id, full_name, display_name, email, avatar_url').eq('id', wo.worker_id).maybeSingle(),
    (supabase as any).from('profiles').select('id, full_name, display_name, email').eq('id', wo.manager_id).maybeSingle(),
  ])

  return {
    ...wo,
    property: propRes.data  ?? null,
    worker:   workerRes.data  ?? null,
    manager:  managerRes.data ?? null,
  }
}
