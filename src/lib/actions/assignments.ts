'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/types/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AssignmentRow {
  id:              string
  property_id:     string
  owner_id:        string
  manager_id:      string
  status:          'requested' | 'active' | 'declined' | 'ended' | 'cancelled'
  management_type: 'full' | 'rental_only' | 'maintenance_only'
  start_date:      string | null
  end_date:        string | null
  notes:           string | null
  requested_at:    string
  accepted_at:     string | null
  declined_at:     string | null
  cancelled_at:    string | null
  ended_at:        string | null
  created_at:      string
  updated_at:      string
  property?: {
    id:           string
    title:        string
    city:         string
    status:       string
    price:        number
    listing_type: string
    address:      string | null
  } | null
  owner?: {
    id:           string
    full_name:    string | null
    display_name: string | null
    email:        string
  } | null
  manager?: {
    id:           string
    full_name:    string | null
    display_name: string | null
    email:        string
    avatar_url:   string | null
  } | null
}

export interface PMResult {
  id:           string
  full_name:    string | null
  display_name: string | null
}

// ─── Find PM by email (owner uses this to locate a manager) ──────────────────

export async function findPropertyManagerByEmail(
  email: string,
): Promise<ActionResult<PMResult>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: pm } = await (supabase as any)
    .from('profiles')
    .select('id, full_name, display_name, role, account_status, email')
    .ilike('email', email.trim())
    .single()

  if (!pm) return { error: 'No account found with this email address.' }
  if (pm.id === user.id) return { error: 'You cannot assign yourself as a Property Manager.' }
  if (pm.role !== 'property_manager') {
    return { error: 'This account is not registered as a Property Manager.' }
  }
  if (pm.account_status !== 'active') {
    return { error: 'This Property Manager has not yet been approved by an administrator.' }
  }

  return { data: { id: pm.id, full_name: pm.full_name, display_name: pm.display_name } }
}

// ─── Request an assignment (owner → PM) ───────────────────────────────────────

export async function requestPropertyAssignment(
  propertyId: string,
  managerId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  // Server-side: verify caller owns the property
  const { data: property } = await (supabase as any)
    .from('properties')
    .select('id, owner_id')
    .eq('id', propertyId)
    .eq('owner_id', user.id)
    .single()
  if (!property) return { error: 'Property not found or you do not own this property.' }

  // Server-side: verify target is an approved property_manager
  const { data: pm } = await (supabase as any)
    .from('profiles')
    .select('id, role, account_status')
    .eq('id', managerId)
    .single()
  if (!pm || pm.role !== 'property_manager') {
    return { error: 'The selected user is not a Property Manager.' }
  }
  if (pm.account_status !== 'active') {
    return { error: 'The selected Property Manager has not yet been approved.' }
  }

  // Prevent duplicate pending or active requests for the same (property, manager) pair
  const { data: existing } = await (supabase as any)
    .from('property_assignments')
    .select('id, status')
    .eq('property_id', propertyId)
    .eq('manager_id', managerId)
    .in('status', ['requested', 'active'])
    .maybeSingle()
  if (existing) {
    return {
      error: existing.status === 'active'
        ? 'This Property Manager is already managing this property.'
        : 'A pending request already exists for this Property Manager on this property.',
    }
  }

  // INSERT via admin client — owner_id set server-side from auth, not client input
  const admin = createAdminClient()
  const { error: insertError } = await (admin as any)
    .from('property_assignments')
    .insert({
      property_id: propertyId,
      owner_id:    user.id,
      manager_id:  managerId,
      status:      'requested',
    })
  if (insertError) return { error: insertError.message }

  revalidatePath(`/seller/listings/${propertyId}/manager`)
  revalidatePath('/seller/listings')
  return {}
}

// ─── PM responds to a request ─────────────────────────────────────────────────

export async function respondToAssignmentRequest(
  assignmentId: string,
  response: 'active' | 'declined',
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  // Verify caller is the PM on this assignment and it is still pending
  const { data: assignment } = await (supabase as any)
    .from('property_assignments')
    .select('id, manager_id, status')
    .eq('id', assignmentId)
    .eq('manager_id', user.id)
    .single()
  if (!assignment) return { error: 'Assignment not found.' }
  if (assignment.status !== 'requested') {
    return { error: 'This request is no longer pending.' }
  }

  const now = new Date().toISOString()
  const patch = response === 'active'
    ? { status: 'active',   accepted_at: now }
    : { status: 'declined', declined_at: now }

  const { error } = await (supabase as any)
    .from('property_assignments')
    .update(patch)
    .eq('id', assignmentId)
    .eq('manager_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/property-manager/properties')
  return {}
}

// ─── Owner cancels a pending request ─────────────────────────────────────────

export async function cancelAssignmentRequest(
  assignmentId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: assignment } = await (supabase as any)
    .from('property_assignments')
    .select('id, owner_id, status')
    .eq('id', assignmentId)
    .eq('owner_id', user.id)
    .single()
  if (!assignment) return { error: 'Assignment not found.' }
  if (assignment.status !== 'requested') {
    return { error: 'Only pending requests can be cancelled.' }
  }

  const { error } = await (supabase as any)
    .from('property_assignments')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', assignmentId)
    .eq('owner_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/seller/listings')
  return {}
}

// ─── Owner or PM ends an active assignment ────────────────────────────────────

export async function endPropertyAssignment(
  assignmentId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: assignment } = await (supabase as any)
    .from('property_assignments')
    .select('id, owner_id, manager_id, status, property_id')
    .eq('id', assignmentId)
    .single()
  if (!assignment) return { error: 'Assignment not found.' }
  if (user.id !== assignment.owner_id && user.id !== assignment.manager_id) {
    return { error: 'You are not a party to this assignment.' }
  }
  if (assignment.status !== 'active') {
    return { error: 'Only active assignments can be ended.' }
  }

  const { error } = await (supabase as any)
    .from('property_assignments')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', assignmentId)
  if (error) return { error: error.message }

  revalidatePath('/property-manager/properties')
  revalidatePath(`/seller/listings/${assignment.property_id}/manager`)
  revalidatePath('/seller/listings')
  return {}
}

// ─── PM: get my assignments (active + requested) ──────────────────────────────

export async function getMyAssignments(): Promise<AssignmentRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: assignments } = await (supabase as any)
    .from('property_assignments')
    .select('*')
    .eq('manager_id', user.id)
    .in('status', ['requested', 'active'])
    .order('requested_at', { ascending: false })

  if (!assignments?.length) return []

  // Enrich with property details
  const propertyIds = [...new Set<string>(assignments.map((a: any) => a.property_id))]
  const { data: properties } = await (supabase as any)
    .from('properties')
    .select('id, title, city, status, price, listing_type, address')
    .in('id', propertyIds)

  // Enrich with owner profiles
  const ownerIds = [...new Set<string>(assignments.map((a: any) => a.owner_id))]
  const { data: owners } = await (supabase as any)
    .from('profiles')
    .select('id, full_name, display_name, email')
    .in('id', ownerIds)

  const propMap: Record<string, any> = Object.fromEntries(
    (properties ?? []).map((p: any) => [p.id, p])
  )
  const ownerMap: Record<string, any> = Object.fromEntries(
    (owners ?? []).map((o: any) => [o.id, o])
  )

  return assignments.map((a: any) => ({
    ...a,
    property: propMap[a.property_id] ?? null,
    owner:    ownerMap[a.owner_id]   ?? null,
  }))
}

// ─── Owner: get all assignment history for a property ────────────────────────

export async function getPropertyAssignments(propertyId: string): Promise<AssignmentRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Verify caller owns the property before returning any data
  const { data: property } = await (supabase as any)
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('owner_id', user.id)
    .single()
  if (!property) return []

  const { data: assignments } = await (supabase as any)
    .from('property_assignments')
    .select('*')
    .eq('property_id', propertyId)
    .order('requested_at', { ascending: false })

  if (!assignments?.length) return []

  // Enrich with manager profiles
  const managerIds = [...new Set<string>(assignments.map((a: any) => a.manager_id))]
  const { data: managers } = await (supabase as any)
    .from('profiles')
    .select('id, full_name, display_name, email, avatar_url')
    .in('id', managerIds)

  const mgrMap: Record<string, any> = Object.fromEntries(
    (managers ?? []).map((m: any) => [m.id, m])
  )

  return assignments.map((a: any) => ({
    ...a,
    manager: mgrMap[a.manager_id] ?? null,
  }))
}
